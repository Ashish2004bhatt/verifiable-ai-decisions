// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AIDecisionRegistry {
    struct DecisionRecord {
        bytes32 fingerprint;
        uint256 timestamp;
        string modelId;
        bool exists;
    }

    mapping(string => DecisionRecord) public decisions;

    event DecisionRegistered(
        string indexed decisionId,
        bytes32 indexed fingerprint,
        uint256 timestamp,
        string modelId
    );

    event DecisionVerified(
        string indexed decisionId,
        bool isValid,
        bytes32 providedFingerprint
    );

    function registerDecision(
        string memory decisionId,
        bytes32 fingerprint,
        string memory modelId
    ) public {
        require(!decisions[decisionId].exists, "Decision already registered");
        
        decisions[decisionId] = DecisionRecord({
            fingerprint: fingerprint,
            timestamp: block.timestamp,
            modelId: modelId,
            exists: true
        });

        emit DecisionRegistered(
            decisionId,
            fingerprint,
            block.timestamp,
            modelId
        );
    }

    function verifyDecision(
        string memory decisionId,
        bytes32 providedFingerprint
    ) public view returns (bool isValid, uint256 timestamp) {
        DecisionRecord memory record = decisions[decisionId];
        
        require(record.exists, "Decision not found");
        
        isValid = record.fingerprint == providedFingerprint;
        timestamp = record.timestamp;

        return (isValid, timestamp);
    }

    function getDecision(
        string memory decisionId
    ) public view returns (
        bytes32 fingerprint,
        uint256 timestamp,
        string memory modelId,
        bool exists
    ) {
        DecisionRecord memory record = decisions[decisionId];
        return (
            record.fingerprint,
            record.timestamp,
            record.modelId,
            record.exists
        );
    }
}

