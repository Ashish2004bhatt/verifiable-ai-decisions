const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIDecisionRegistry", function () {
  let registry;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const AIDecisionRegistry = await ethers.getContractFactory("AIDecisionRegistry");
    registry = await AIDecisionRegistry.deploy();
  });

  it("Should register a decision", async function () {
    const decisionId = "test-decision-1";
    const fingerprint = ethers.id("test-fingerprint");
    const modelId = "radiology-v1.0";

    await registry.registerDecision(decisionId, fingerprint, modelId);
    
    const decision = await registry.getDecision(decisionId);
    expect(decision.exists).to.be.true;
    expect(decision.fingerprint).to.equal(fingerprint);
    expect(decision.modelId).to.equal(modelId);
  });

  it("Should verify a correct fingerprint", async function () {
    const decisionId = "test-decision-2";
    const fingerprint = ethers.id("test-fingerprint");
    const modelId = "radiology-v1.0";

    await registry.registerDecision(decisionId, fingerprint, modelId);
    
    const [isValid] = await registry.verifyDecision(decisionId, fingerprint);
    expect(isValid).to.be.true;
  });

  it("Should reject incorrect fingerprint", async function () {
    const decisionId = "test-decision-3";
    const fingerprint = ethers.id("test-fingerprint");
    const wrongFingerprint = ethers.id("wrong-fingerprint");
    const modelId = "radiology-v1.0";

    await registry.registerDecision(decisionId, fingerprint, modelId);
    
    const [isValid] = await registry.verifyDecision(decisionId, wrongFingerprint);
    expect(isValid).to.be.false;
  });

  it("Should prevent duplicate registration", async function () {
    const decisionId = "test-decision-4";
    const fingerprint = ethers.id("test-fingerprint");
    const modelId = "radiology-v1.0";

    await registry.registerDecision(decisionId, fingerprint, modelId);
    
    await expect(
      registry.registerDecision(decisionId, fingerprint, modelId)
    ).to.be.revertedWith("Decision already registered");
  });
});

