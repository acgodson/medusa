// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DeviceNFT is ERC721, Ownable(msg.sender), ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // Core mappings
    mapping(uint256 => address) private _deviceAddresses;
    mapping(address => uint256) private _addressToTokenId;

    // Blacklist mappings
    mapping(address => bool) public isDeviceBlacklisted;
    mapping(address => bool) public isOwnerBlacklisted;

    // Mapping to track if device was ever registered
    mapping(address => bool) public wasDeviceEverRegistered;

    // Events
    event DeviceAdded(uint256 indexed tokenId, address indexed deviceAddress, address indexed owner);
    event DeviceBlacklisted(address indexed deviceAddress);
    event DeviceUnblacklisted(address indexed deviceAddress);
    event OwnerBlacklisted(address indexed owner);
    event OwnerUnblacklisted(address indexed owner);

    error DeviceAlreadyRegistered();
    error DeviceIsBlacklisted();
    error OwnerIsBlacklisted();
    error InvalidAddress();
    error DeviceNotActive();
    error TokenNonexistent();
    error AlreadyBlacklisted();
    error NotBlacklisted();

    constructor() ERC721("Device Ownership Token", "DOT") {}

    /**
     * @dev Device adds itself and mints NFT to specified owner
     * @param owner Address to receive the NFT
     */
    function addDevice(address owner) external nonReentrant whenNotPaused {
        if (isDeviceBlacklisted[msg.sender]) revert DeviceIsBlacklisted();
        if (isOwnerBlacklisted[owner]) revert OwnerIsBlacklisted();
        if (wasDeviceEverRegistered[msg.sender]) revert DeviceAlreadyRegistered();
        if (owner == address(0)) revert InvalidAddress();

        // Update state before external calls
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _deviceAddresses[newTokenId] = msg.sender;
        _addressToTokenId[msg.sender] = newTokenId;
        wasDeviceEverRegistered[msg.sender] = true;

        // Mint token after state updates
        _safeMint(owner, newTokenId);

        emit DeviceAdded(newTokenId, msg.sender, owner);
    }

    /**
     * @dev Get device address for a token ID
     */
    function getDeviceAddress(uint256 tokenId) external view returns (address) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNonexistent();
        return _deviceAddresses[tokenId];
    }

    /**
     * @dev Check if caller owns the device
     */
    function ownsDevice(address deviceAddress, address owner) external view returns (bool) {
        if (isDeviceBlacklisted[deviceAddress]) revert DeviceIsBlacklisted();
        if (isOwnerBlacklisted[owner]) revert OwnerIsBlacklisted();
        if (deviceAddress == address(0)) revert InvalidAddress();
        if (owner == address(0)) revert InvalidAddress();

        uint256 tokenId = _addressToTokenId[deviceAddress];
        // Check if token exists by checking the device mapping instead of relying on tokenId != 0
        return _deviceAddresses[tokenId] == deviceAddress && ownerOf(tokenId) == owner;
    }

    /**
     * @dev Blacklist a device (only owner)
     */
    function blacklistDevice(address device) external onlyOwner {
        if (device == address(0)) revert InvalidAddress();
        if (isDeviceBlacklisted[device]) revert AlreadyBlacklisted();
        isDeviceBlacklisted[device] = true;
        emit DeviceBlacklisted(device);
    }

    /**
     * @dev Remove device from blacklist (only owner)
     */
    function unblacklistDevice(address device) external onlyOwner {
        if (device == address(0)) revert InvalidAddress();
        if (!isDeviceBlacklisted[device]) revert NotBlacklisted();
        isDeviceBlacklisted[device] = false;
        emit DeviceUnblacklisted(device);
    }

    /**
     * @dev Blacklist an owner (only owner)
     */
    function blacklistOwner(address owner) external onlyOwner {
        if (owner == address(0)) revert InvalidAddress();
        if (isOwnerBlacklisted[owner]) revert AlreadyBlacklisted();
        isOwnerBlacklisted[owner] = true;
        emit OwnerBlacklisted(owner);
    }

    /**
     * @dev Remove owner from blacklist (only owner)
     */
    function unblacklistOwner(address owner) external onlyOwner {
        if (owner == address(0)) revert InvalidAddress();
        if (!isOwnerBlacklisted[owner]) revert NotBlacklisted();
        isOwnerBlacklisted[owner] = false;
        emit OwnerUnblacklisted(owner);
    }

    /**
     * @dev Pause contract in emergency (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        if (isOwnerBlacklisted[to]) revert OwnerIsBlacklisted();
        return super._update(to, tokenId, auth);
    }
}
