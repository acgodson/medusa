import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  DeviceBlacklisted,
  DeviceCleanedUp,
  DeviceDeregistered,
  DevicePartitionCreated,
  DevicePartitionFilled,
  DeviceRegistered,
  DeviceRemoved,
  Paused,
  RecordUpdated,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  StorageCleanup,
  StorageLocked,
  StorageUnlocked,
  Unpaused,
  WorkflowArchived,
  WorkflowCreated,
  WorkflowExecutionIntervalUpdated,
  WorkflowPauseToggled
} from "../generated/MedusaRegistry/MedusaRegistry"

export function createDeviceBlacklistedEvent(
  walletId: string,
  deviceAddress: Address,
  blacklister: Address,
  status: boolean
): DeviceBlacklisted {
  let deviceBlacklistedEvent = changetype<DeviceBlacklisted>(newMockEvent())

  deviceBlacklistedEvent.parameters = new Array()

  deviceBlacklistedEvent.parameters.push(
    new ethereum.EventParam("walletId", ethereum.Value.fromString(walletId))
  )
  deviceBlacklistedEvent.parameters.push(
    new ethereum.EventParam(
      "deviceAddress",
      ethereum.Value.fromAddress(deviceAddress)
    )
  )
  deviceBlacklistedEvent.parameters.push(
    new ethereum.EventParam(
      "blacklister",
      ethereum.Value.fromAddress(blacklister)
    )
  )
  deviceBlacklistedEvent.parameters.push(
    new ethereum.EventParam("status", ethereum.Value.fromBoolean(status))
  )

  return deviceBlacklistedEvent
}

export function createDeviceCleanedUpEvent(
  walletId: string,
  workflowId: BigInt,
  lastActiveTimestamp: BigInt,
  cleanupTimestamp: BigInt
): DeviceCleanedUp {
  let deviceCleanedUpEvent = changetype<DeviceCleanedUp>(newMockEvent())

  deviceCleanedUpEvent.parameters = new Array()

  deviceCleanedUpEvent.parameters.push(
    new ethereum.EventParam("walletId", ethereum.Value.fromString(walletId))
  )
  deviceCleanedUpEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  deviceCleanedUpEvent.parameters.push(
    new ethereum.EventParam(
      "lastActiveTimestamp",
      ethereum.Value.fromUnsignedBigInt(lastActiveTimestamp)
    )
  )
  deviceCleanedUpEvent.parameters.push(
    new ethereum.EventParam(
      "cleanupTimestamp",
      ethereum.Value.fromUnsignedBigInt(cleanupTimestamp)
    )
  )

  return deviceCleanedUpEvent
}

export function createDeviceDeregisteredEvent(
  workflowId: BigInt,
  walletId: string,
  deregistrar: Address
): DeviceDeregistered {
  let deviceDeregisteredEvent = changetype<DeviceDeregistered>(newMockEvent())

  deviceDeregisteredEvent.parameters = new Array()

  deviceDeregisteredEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  deviceDeregisteredEvent.parameters.push(
    new ethereum.EventParam("walletId", ethereum.Value.fromString(walletId))
  )
  deviceDeregisteredEvent.parameters.push(
    new ethereum.EventParam(
      "deregistrar",
      ethereum.Value.fromAddress(deregistrar)
    )
  )

  return deviceDeregisteredEvent
}

export function createDevicePartitionCreatedEvent(
  partitionIndex: BigInt,
  startBlock: BigInt,
  endBlock: BigInt
): DevicePartitionCreated {
  let devicePartitionCreatedEvent =
    changetype<DevicePartitionCreated>(newMockEvent())

  devicePartitionCreatedEvent.parameters = new Array()

  devicePartitionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "partitionIndex",
      ethereum.Value.fromUnsignedBigInt(partitionIndex)
    )
  )
  devicePartitionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "startBlock",
      ethereum.Value.fromUnsignedBigInt(startBlock)
    )
  )
  devicePartitionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "endBlock",
      ethereum.Value.fromUnsignedBigInt(endBlock)
    )
  )

  return devicePartitionCreatedEvent
}

export function createDevicePartitionFilledEvent(
  partitionIndex: BigInt
): DevicePartitionFilled {
  let devicePartitionFilledEvent =
    changetype<DevicePartitionFilled>(newMockEvent())

  devicePartitionFilledEvent.parameters = new Array()

  devicePartitionFilledEvent.parameters.push(
    new ethereum.EventParam(
      "partitionIndex",
      ethereum.Value.fromUnsignedBigInt(partitionIndex)
    )
  )

  return devicePartitionFilledEvent
}

export function createDeviceRegisteredEvent(
  workflowId: BigInt,
  walletId: string,
  deviceAddress: Address,
  registrar: Address
): DeviceRegistered {
  let deviceRegisteredEvent = changetype<DeviceRegistered>(newMockEvent())

  deviceRegisteredEvent.parameters = new Array()

  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam("walletId", ethereum.Value.fromString(walletId))
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "deviceAddress",
      ethereum.Value.fromAddress(deviceAddress)
    )
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam("registrar", ethereum.Value.fromAddress(registrar))
  )

  return deviceRegisteredEvent
}

export function createDeviceRemovedEvent(
  workflowId: BigInt,
  walletId: string,
  partition: BigInt,
  timestamp: BigInt
): DeviceRemoved {
  let deviceRemovedEvent = changetype<DeviceRemoved>(newMockEvent())

  deviceRemovedEvent.parameters = new Array()

  deviceRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  deviceRemovedEvent.parameters.push(
    new ethereum.EventParam("walletId", ethereum.Value.fromString(walletId))
  )
  deviceRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "partition",
      ethereum.Value.fromUnsignedBigInt(partition)
    )
  )
  deviceRemovedEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )

  return deviceRemovedEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createRecordUpdatedEvent(
  walletId: string,
  workflowId: BigInt,
  counter: BigInt
): RecordUpdated {
  let recordUpdatedEvent = changetype<RecordUpdated>(newMockEvent())

  recordUpdatedEvent.parameters = new Array()

  recordUpdatedEvent.parameters.push(
    new ethereum.EventParam("walletId", ethereum.Value.fromString(walletId))
  )
  recordUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  recordUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "counter",
      ethereum.Value.fromUnsignedBigInt(counter)
    )
  )

  return recordUpdatedEvent
}

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent())

  roleAdminChangedEvent.parameters = new Array()

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdminRole",
      ethereum.Value.fromFixedBytes(previousAdminRole)
    )
  )
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newAdminRole",
      ethereum.Value.fromFixedBytes(newAdminRole)
    )
  )

  return roleAdminChangedEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleRevokedEvent
}

export function createStorageCleanupEvent(
  user: Address,
  workflowId: BigInt,
  deletedCount: BigInt,
  timestamp: BigInt
): StorageCleanup {
  let storageCleanupEvent = changetype<StorageCleanup>(newMockEvent())

  storageCleanupEvent.parameters = new Array()

  storageCleanupEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  storageCleanupEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  storageCleanupEvent.parameters.push(
    new ethereum.EventParam(
      "deletedCount",
      ethereum.Value.fromUnsignedBigInt(deletedCount)
    )
  )
  storageCleanupEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )

  return storageCleanupEvent
}

export function createStorageLockedEvent(workflowId: BigInt): StorageLocked {
  let storageLockedEvent = changetype<StorageLocked>(newMockEvent())

  storageLockedEvent.parameters = new Array()

  storageLockedEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )

  return storageLockedEvent
}

export function createStorageUnlockedEvent(
  workflowId: BigInt
): StorageUnlocked {
  let storageUnlockedEvent = changetype<StorageUnlocked>(newMockEvent())

  storageUnlockedEvent.parameters = new Array()

  storageUnlockedEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )

  return storageUnlockedEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}

export function createWorkflowArchivedEvent(
  workflowId: BigInt,
  owner: Address
): WorkflowArchived {
  let workflowArchivedEvent = changetype<WorkflowArchived>(newMockEvent())

  workflowArchivedEvent.parameters = new Array()

  workflowArchivedEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  workflowArchivedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )

  return workflowArchivedEvent
}

export function createWorkflowCreatedEvent(
  id: BigInt,
  title: string,
  owner: Address,
  schemaId: string
): WorkflowCreated {
  let workflowCreatedEvent = changetype<WorkflowCreated>(newMockEvent())

  workflowCreatedEvent.parameters = new Array()

  workflowCreatedEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  )
  workflowCreatedEvent.parameters.push(
    new ethereum.EventParam("title", ethereum.Value.fromString(title))
  )
  workflowCreatedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  workflowCreatedEvent.parameters.push(
    new ethereum.EventParam("schemaId", ethereum.Value.fromString(schemaId))
  )

  return workflowCreatedEvent
}

export function createWorkflowExecutionIntervalUpdatedEvent(
  workflowId: BigInt,
  newInterval: BigInt
): WorkflowExecutionIntervalUpdated {
  let workflowExecutionIntervalUpdatedEvent =
    changetype<WorkflowExecutionIntervalUpdated>(newMockEvent())

  workflowExecutionIntervalUpdatedEvent.parameters = new Array()

  workflowExecutionIntervalUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  workflowExecutionIntervalUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newInterval",
      ethereum.Value.fromUnsignedBigInt(newInterval)
    )
  )

  return workflowExecutionIntervalUpdatedEvent
}

export function createWorkflowPauseToggledEvent(
  workflowId: BigInt,
  isPaused: boolean
): WorkflowPauseToggled {
  let workflowPauseToggledEvent =
    changetype<WorkflowPauseToggled>(newMockEvent())

  workflowPauseToggledEvent.parameters = new Array()

  workflowPauseToggledEvent.parameters.push(
    new ethereum.EventParam(
      "workflowId",
      ethereum.Value.fromUnsignedBigInt(workflowId)
    )
  )
  workflowPauseToggledEvent.parameters.push(
    new ethereum.EventParam("isPaused", ethereum.Value.fromBoolean(isPaused))
  )

  return workflowPauseToggledEvent
}
