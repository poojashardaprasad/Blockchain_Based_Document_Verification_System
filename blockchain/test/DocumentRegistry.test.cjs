const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry Smart Contract", function () {
    let DocumentRegistry;
    let registry;
    let owner;
    let user1;
    let user2;

    const testHash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test Document 1"));
    const testHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test Document 2"));

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
        registry = await DocumentRegistry.deploy();
        await registry.deployed();
    });

    describe("Document Anchoring", function () {
        it("should allow an issuer to anchor a new document", async function () {
            const tx = await registry.connect(user1).anchorDocument(testHash1);
            await expect(tx)
                .to.emit(registry, "DocumentAnchored")
                .withArgs(testHash1, user1.address, (await ethers.provider.getBlock("latest")).timestamp);

            const [exists, issuer, timestamp, status, reason] = await registry.verifyDocument(testHash1);
            expect(exists).to.equal(true);
            expect(issuer).to.equal(user1.address);
            expect(timestamp).to.be.gt(0);
            expect(status).to.equal(0); // Active
            expect(reason).to.equal("");
        });

        it("should reject anchoring an already anchored document", async function () {
            await registry.connect(user1).anchorDocument(testHash1);
            await expect(
                registry.connect(user2).anchorDocument(testHash1)
            ).to.be.revertedWith("Document already anchored");
        });

        it("should reject anchoring bytes32(0)", async function () {
            await expect(
                registry.connect(user1).anchorDocument(ethers.constants.HashZero)
            ).to.be.revertedWith("Invalid hash");
        });
    });

    describe("Document Verification", function () {
        it("should revert if verifying a non-existent document", async function () {
            await expect(
                registry.verifyDocument(testHash2)
            ).to.be.revertedWith("Document not found");
        });

        it("should return correct details for an existing document", async function () {
            await registry.connect(user1).anchorDocument(testHash1);
            const doc = await registry.documents(testHash1);
            expect(doc.issuer).to.equal(user1.address);
            expect(doc.status).to.equal(0);
        });
    });

    describe("Document Revocation", function () {
        beforeEach(async function () {
            await registry.connect(user1).anchorDocument(testHash1);
        });

        it("should allow the issuer to revoke their document", async function () {
            const reason = "Degree recalled due to administrative error";
            const tx = await registry.connect(user1).revokeDocument(testHash1, reason);

            await expect(tx)
                .to.emit(registry, "DocumentRevoked")
                .withArgs(testHash1, reason, user1.address);

            const [exists, issuer, timestamp, status, revocationReason] = await registry.verifyDocument(testHash1);
            expect(exists).to.equal(true);
            expect(status).to.equal(1); // Revoked
            expect(revocationReason).to.equal(reason);
        });

        it("should reject revocation from someone who is not the issuer", async function () {
            await expect(
                registry.connect(user2).revokeDocument(testHash1, "Malicious attempt")
            ).to.be.revertedWith("Only issuer can revoke");
        });

        it("should reject revoking an already revoked document", async function () {
            await registry.connect(user1).revokeDocument(testHash1, "First revocation");
            await expect(
                registry.connect(user1).revokeDocument(testHash1, "Second attempt")
            ).to.be.revertedWith("Document already revoked");
        });
    });
});
