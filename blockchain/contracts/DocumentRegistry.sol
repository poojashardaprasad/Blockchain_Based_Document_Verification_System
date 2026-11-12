// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DocumentRegistry {
    enum DocumentStatus { Active, Revoked }

    struct Document {
        bytes32 docHash;
        address issuer;
        uint256 timestamp;
        uint256 blockNumber;
        DocumentStatus status;
        string revocationReason;
    }

    // Mapping from Document Hash -> Document Details
    mapping(bytes32 => Document) public documents;
    
    // Mapping to check if hash exists
    mapping(bytes32 => bool) public docExists;

    event DocumentAnchored(bytes32 indexed docHash, address indexed issuer, uint256 timestamp);
    event DocumentRevoked(bytes32 indexed docHash, string reason, address indexed by);

    modifier onlyIssuer(bytes32 _docHash) {
        require(documents[_docHash].issuer == msg.sender, "Only issuer can revoke");
        _;
    }

    function anchorDocument(bytes32 _docHash) external {
        require(!docExists[_docHash], "Document already anchored");
        require(_docHash != bytes32(0), "Invalid hash");

        documents[_docHash] = Document({
            docHash: _docHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number,
            status: DocumentStatus.Active,
            revocationReason: ""
        });

        docExists[_docHash] = true;

        emit DocumentAnchored(_docHash, msg.sender, block.timestamp);
    }

    function verifyDocument(bytes32 _docHash) external view returns (bool, address, uint256, DocumentStatus, string memory) {
        require(docExists[_docHash], "Document not found");
        Document memory doc = documents[_docHash];
        return (true, doc.issuer, doc.timestamp, doc.status, doc.revocationReason);
    }

    // Optional: Allow issuer to revoke the document on-chain
    function revokeDocument(bytes32 _docHash, string memory _reason) external onlyIssuer(_docHash) {
        require(documents[_docHash].status == DocumentStatus.Active, "Document already revoked");
        
        documents[_docHash].status = DocumentStatus.Revoked;
        documents[_docHash].revocationReason = _reason;

        emit DocumentRevoked(_docHash, _reason, msg.sender);
    }
}
