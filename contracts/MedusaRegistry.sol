// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MedusaRegistry is Ownable {
    struct MetadataRecord {
        string ipnsName;
        string ipnsId;
        address controller;
        uint256 timestamp;
        bool active;
    }

    // Counter for generating unique IDs
    uint256 private _recordCounter;

    // Mapping from ID to MetadataRecord
    mapping(uint256 => MetadataRecord) public records;

    // Mapping from IPNS ID to record ID for quick lookups
    mapping(string => uint256) public ipnsToRecordId;

    // Events
    event RecordCreated(
        uint256 indexed id,
        string ipnsName,
        string ipnsId,
        address controller
    );
    event RecordUpdated(uint256 indexed id, string ipnsName, string ipnsId);
    event RecordDeactivated(uint256 indexed id);

    constructor() Ownable(msg.sender) {}

    function createRecord(
        string memory ipnsName,
        string memory ipnsId
    ) external returns (uint256) {
        require(bytes(ipnsName).length > 0, "Invalid IPNS name");
        require(bytes(ipnsId).length > 0, "Invalid IPNS ID");
        require(ipnsToRecordId[ipnsId] == 0, "IPNS ID already registered");

        _recordCounter++;
        uint256 newRecordId = _recordCounter;

        records[newRecordId] = MetadataRecord({
            ipnsName: ipnsName,
            ipnsId: ipnsId,
            controller: msg.sender,
            timestamp: block.timestamp,
            active: true
        });

        ipnsToRecordId[ipnsId] = newRecordId;

        emit RecordCreated(newRecordId, ipnsName, ipnsId, msg.sender);
        return newRecordId;
    }

    function updateRecord(
        uint256 recordId,
        string memory newIpnsName,
        string memory newIpnsId
    ) external {
        require(
            recordId > 0 && recordId <= _recordCounter,
            "Invalid record ID"
        );
        MetadataRecord storage record = records[recordId];
        require(record.active, "Record is deactivated");
        require(record.controller == msg.sender, "Not record creator");

        // Remove old IPNS ID mapping
        delete ipnsToRecordId[record.ipnsId];

        // Update record
        record.ipnsName = newIpnsName;
        record.ipnsId = newIpnsId;
        record.timestamp = block.timestamp;

        // Add new IPNS ID mapping
        ipnsToRecordId[newIpnsId] = recordId;

        emit RecordUpdated(recordId, newIpnsName, newIpnsId);
    }

    function deactivateRecord(uint256 recordId) external {
        require(
            recordId > 0 && recordId <= _recordCounter,
            "Invalid record ID"
        );
        MetadataRecord storage record = records[recordId];
        require(record.active, "Record already deactivated");
        require(
            record.controller == msg.sender || owner() == msg.sender,
            "Not authorized"
        );

        record.active = false;
        delete ipnsToRecordId[record.ipnsId];

        emit RecordDeactivated(recordId);
    }

    function getRecord(
        uint256 recordId
    ) external view returns (MetadataRecord memory) {
        require(
            recordId > 0 && recordId <= _recordCounter,
            "Invalid record ID"
        );
        return records[recordId];
    }

    function getRecordByIpns(
        string memory ipnsId
    ) external view returns (MetadataRecord memory) {
        uint256 recordId = ipnsToRecordId[ipnsId];
        require(recordId > 0, "Record not found");
        return records[recordId];
    }

    function getRecordCount() external view returns (uint256) {
        return _recordCounter;
    }
}
