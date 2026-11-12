const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

/**
 * Universal Storage Service
 * Supports:
 * 1. Cloudflare R2 / AWS S3 / Supabase / MinIO (S3-compatible Object Storage) via AWS SigV4
 * 2. Persistent Local Filesystem (fallback when S3 credentials are not provided)
 * 
 * Guarantees zero sensitive document exposure (private ACL only).
 */
class StorageService {
    constructor() {
        this.bucket = process.env.S3_BUCKET || process.env.STORAGE_BUCKET || '';
        this.endpoint = process.env.S3_ENDPOINT || '';
        this.region = process.env.S3_REGION || 'us-east-1';
        this.accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
        this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
        this.forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';

        // Local storage directory fallback
        this.localStorageDir = process.env.STORAGE_DIR || path.join(__dirname, '../certificates');
        this.ensureLocalDirectory(this.localStorageDir);
    }

    ensureLocalDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Checks if cloud object storage is configured and active.
     */
    isCloudStorageEnabled() {
        return Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
    }

    /**
     * Store file buffer or local file path
     * @param {Object} options
     * @param {string} options.key - File path/key in storage (e.g. 'certificates/cert_123.pdf')
     * @param {Buffer|string} options.body - File buffer or local file path
     * @param {string} [options.contentType] - MIME type
     * @returns {Promise<{ key: string, storageType: 'cloud' | 'local', path?: string }>}
     */
    async storeFile({ key, body, contentType = 'application/octet-stream' }) {
        const cleanKey = key.replace(/^\/+/, '');

        if (this.isCloudStorageEnabled()) {
            let bufferData;
            if (Buffer.isBuffer(body)) {
                bufferData = body;
            } else if (typeof body === 'string' && fs.existsSync(body)) {
                bufferData = fs.readFileSync(body);
            } else {
                bufferData = Buffer.from(body);
            }

            await this._putS3Object(cleanKey, bufferData, contentType);
            console.log(`☁️  [StorageService] Uploaded ${cleanKey} to Cloud Storage (${this.bucket})`);
            return { key: cleanKey, storageType: 'cloud' };
        } else {
            // Local filesystem storage
            const targetPath = path.join(this.localStorageDir, cleanKey);
            this.ensureLocalDirectory(path.dirname(targetPath));

            if (Buffer.isBuffer(body)) {
                fs.writeFileSync(targetPath, body);
            } else if (typeof body === 'string' && fs.existsSync(body)) {
                if (path.resolve(body) !== path.resolve(targetPath)) {
                    fs.copyFileSync(body, targetPath);
                }
            } else {
                fs.writeFileSync(targetPath, body);
            }

            return { key: cleanKey, storageType: 'local', path: targetPath };
        }
    }

    /**
     * Retrieve file as Buffer
     * @param {string} key
     * @returns {Promise<Buffer|null>}
     */
    async getFile(key) {
        const cleanKey = key.replace(/^\/+/, '');

        if (this.isCloudStorageEnabled()) {
            return await this._getS3Object(cleanKey);
        } else {
            const localPath = path.join(this.localStorageDir, cleanKey);
            if (fs.existsSync(localPath)) {
                return fs.readFileSync(localPath);
            }
            return null;
        }
    }

    /**
     * Check if file exists
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async fileExists(key) {
        const cleanKey = key.replace(/^\/+/, '');

        if (this.isCloudStorageEnabled()) {
            try {
                return await this._headS3Object(cleanKey);
            } catch {
                return false;
            }
        } else {
            const localPath = path.join(this.localStorageDir, cleanKey);
            return fs.existsSync(localPath);
        }
    }

    /**
     * Generates a secure presigned download URL (valid for specified seconds)
     * For cloud storage, generates an AWS SigV4 signed URL.
     * For local storage, returns a fallback download path.
     * @param {string} key
     * @param {number} [expiresInSeconds=3600]
     * @returns {string}
     */
    getSignedDownloadUrl(key, expiresInSeconds = 3600) {
        const cleanKey = key.replace(/^\/+/, '');

        if (this.isCloudStorageEnabled()) {
            return this._generateS3PresignedUrl('GET', cleanKey, expiresInSeconds);
        } else {
            // Return relative API path
            return `/api/certificates/download/${cleanKey.replace(/^certificate_/, '').replace(/\.pdf$/, '')}`;
        }
    }

    // =========================================================================
    // AWS SigV4 Pure Node.js Implementation (Zero external dependencies)
    // =========================================================================

    _parseEndpoint() {
        if (this.endpoint) {
            let ep = this.endpoint.trim();
            if (!ep.startsWith('http://') && !ep.startsWith('https://')) {
                ep = 'https://' + ep;
            }
            const parsed = new URL(ep);
            return {
                protocol: parsed.protocol,
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                basePath: parsed.pathname.replace(/\/+$/, '')
            };
        }

        // Standard AWS S3 URL
        const hostname = `${this.bucket}.s3.${this.region}.amazonaws.com`;
        return {
            protocol: 'https:',
            hostname,
            port: 443,
            basePath: ''
        };
    }

    _getSignatureKey(key, dateStamp, regionName, serviceName) {
        const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
        const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
        const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
        const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
        return kSigning;
    }

    _putS3Object(key, buffer, contentType) {
        return new Promise((resolve, reject) => {
            const { protocol, hostname, port, basePath } = this._parseEndpoint();
            const requestPath = `${basePath}/${this.bucket}/${key}`;

            const now = new Date();
            const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
            const dateStamp = amzDate.substring(0, 8);

            const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

            const headers = {
                'host': hostname,
                'content-type': contentType,
                'content-length': buffer.length,
                'x-amz-date': amzDate,
                'x-amz-content-sha256': payloadHash,
                'x-amz-acl': 'private' // Guarantee private storage
            };

            const canonicalHeaders = `content-length:${buffer.length}\n` +
                `content-type:${contentType}\n` +
                `host:${hostname}\n` +
                `x-amz-acl:private\n` +
                `x-amz-content-sha256:${payloadHash}\n` +
                `x-amz-date:${amzDate}\n`;

            const signedHeaders = 'content-length;content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date';

            const canonicalRequest = `PUT\n${requestPath}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
            const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

            const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
            const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

            const signingKey = this._getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
            const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

            headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

            const client = protocol === 'https:' ? https : http;
            const req = client.request({
                method: 'PUT',
                hostname,
                port,
                path: requestPath,
                headers
            }, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(true);
                } else {
                    let errBody = '';
                    res.on('data', chunk => { errBody += chunk; });
                    res.on('end', () => {
                        reject(new Error(`S3 PUT failed with status ${res.statusCode}: ${errBody}`));
                    });
                }
            });

            req.on('error', reject);
            req.write(buffer);
            req.end();
        });
    }

    _getS3Object(key) {
        return new Promise((resolve, reject) => {
            const { protocol, hostname, port, basePath } = this._parseEndpoint();
            const requestPath = `${basePath}/${this.bucket}/${key}`;

            const now = new Date();
            const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
            const dateStamp = amzDate.substring(0, 8);

            const emptyHash = crypto.createHash('sha256').update('').digest('hex');

            const headers = {
                'host': hostname,
                'x-amz-date': amzDate,
                'x-amz-content-sha256': emptyHash
            };

            const canonicalHeaders = `host:${hostname}\n` +
                `x-amz-content-sha256:${emptyHash}\n` +
                `x-amz-date:${amzDate}\n`;

            const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

            const canonicalRequest = `GET\n${requestPath}\n\n${canonicalHeaders}\n${signedHeaders}\n${emptyHash}`;
            const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

            const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
            const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

            const signingKey = this._getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
            const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

            headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

            const client = protocol === 'https:' ? https : http;
            const req = client.request({
                method: 'GET',
                hostname,
                port,
                path: requestPath,
                headers
            }, (res) => {
                if (res.statusCode === 404) {
                    return resolve(null);
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`S3 GET failed with status ${res.statusCode}`));
                }

                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });

            req.on('error', reject);
            req.end();
        });
    }

    _headS3Object(key) {
        return new Promise((resolve, reject) => {
            const { protocol, hostname, port, basePath } = this._parseEndpoint();
            const requestPath = `${basePath}/${this.bucket}/${key}`;

            const now = new Date();
            const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
            const dateStamp = amzDate.substring(0, 8);

            const emptyHash = crypto.createHash('sha256').update('').digest('hex');

            const headers = {
                'host': hostname,
                'x-amz-date': amzDate,
                'x-amz-content-sha256': emptyHash
            };

            const canonicalHeaders = `host:${hostname}\n` +
                `x-amz-content-sha256:${emptyHash}\n` +
                `x-amz-date:${amzDate}\n`;

            const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

            const canonicalRequest = `HEAD\n${requestPath}\n\n${canonicalHeaders}\n${signedHeaders}\n${emptyHash}`;
            const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

            const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
            const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

            const signingKey = this._getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
            const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

            headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

            const client = protocol === 'https:' ? https : http;
            const req = client.request({
                method: 'HEAD',
                hostname,
                port,
                path: requestPath,
                headers
            }, (res) => {
                if (res.statusCode === 200) resolve(true);
                else resolve(false);
            });

            req.on('error', reject);
            req.end();
        });
    }

    _generateS3PresignedUrl(method, key, expiresInSeconds) {
        const { protocol, hostname, port, basePath } = this._parseEndpoint();
        const requestPath = `${basePath}/${this.bucket}/${key}`;

        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substring(0, 8);
        const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

        const queryParams = {
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expiresInSeconds.toString(),
            'X-Amz-SignedHeaders': 'host'
        };

        const sortedQuery = Object.keys(queryParams)
            .sort()
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
            .join('&');

        const canonicalHeaders = `host:${hostname}\n`;
        const canonicalRequest = `${method}\n${requestPath}\n${sortedQuery}\n${canonicalHeaders}\nhost\nUNSIGNED-PAYLOAD`;
        const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

        const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
        const signingKey = this._getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
        const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

        const portSuffix = (protocol === 'https:' && port === 443) || (protocol === 'http:' && port === 80) ? '' : `:${port}`;
        return `${protocol}//${hostname}${portSuffix}${requestPath}?${sortedQuery}&X-Amz-Signature=${signature}`;
    }
}

module.exports = new StorageService();
