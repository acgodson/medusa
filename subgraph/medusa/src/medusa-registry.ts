import {
  DeviceBlacklisted as DeviceBlacklistedEvent,
  DeviceCleanedUp as DeviceCleanedUpEvent,
  DeviceDeregistered as DeviceDeregisteredEvent,
  DevicePartitionCreated as DevicePartitionCreatedEvent,
  DevicePartitionFilled as DevicePartitionFilledEvent,
  DeviceRegistered as DeviceRegisteredEvent,
  DeviceRemoved as DeviceRemovedEvent,
  Paused as PausedEvent,
  RecordUpdated as RecordUpdatedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  StorageCleanup as StorageCleanupEvent,
  StorageLocked as StorageLockedEvent,
  StorageUnlocked as StorageUnlockedEvent,
  Unpaused as UnpausedEvent,
  WorkflowArchived as WorkflowArchivedEvent,
  WorkflowCreated as WorkflowCreatedEvent,
  WorkflowExecutionIntervalUpdated as WorkflowExecutionIntervalUpdatedEvent,
  WorkflowPauseToggled as WorkflowPauseToggledEvent
} from "../generated/MedusaRegistry/MedusaRegistry"
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
} from "../generated/schema"

export function handleDeviceBlacklisted(event: DeviceBlacklistedEvent): void {
  let entity = new DeviceBlacklisted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.walletId = event.params.walletId
  entity.deviceAddress = event.params.deviceAddress
  entity.blacklister = event.params.blacklister
  entity.status = event.params.status

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeviceCleanedUp(event: DeviceCleanedUpEvent): void {
  let entity = new DeviceCleanedUp(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.walletId = event.params.walletId
  entity.workflowId = event.params.workflowId
  entity.lastActiveTimestamp = event.params.lastActiveTimestamp
  entity.cleanupTimestamp = event.params.cleanupTimestamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeviceDeregistered(event: DeviceDeregisteredEvent): void {
  let entity = new DeviceDeregistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId
  entity.walletId = event.params.walletId
  entity.deregistrar = event.params.deregistrar

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDevicePartitionCreated(
  event: DevicePartitionCreatedEvent
): void {
  let entity = new DevicePartitionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.partitionIndex = event.params.partitionIndex
  entity.startBlock = event.params.startBlock
  entity.endBlock = event.params.endBlock

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDevicePartitionFilled(
  event: DevicePartitionFilledEvent
): void {
  let entity = new DevicePartitionFilled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.partitionIndex = event.params.partitionIndex

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeviceRegistered(event: DeviceRegisteredEvent): void {
  let entity = new DeviceRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId
  entity.walletId = event.params.walletId
  entity.deviceAddress = event.params.deviceAddress
  entity.registrar = event.params.registrar

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeviceRemoved(event: DeviceRemovedEvent): void {
  let entity = new DeviceRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId
  entity.walletId = event.params.walletId
  entity.partition = event.params.partition
  entity.timestamp = event.params.timestamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePaused(event: PausedEvent): void {
  let entity = new Paused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRecordUpdated(event: RecordUpdatedEvent): void {
  let entity = new RecordUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.walletId = event.params.walletId
  entity.workflowId = event.params.workflowId
  entity.counter = event.params.counter

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.previousAdminRole = event.params.previousAdminRole
  entity.newAdminRole = event.params.newAdminRole

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStorageCleanup(event: StorageCleanupEvent): void {
  let entity = new StorageCleanup(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.workflowId = event.params.workflowId
  entity.deletedCount = event.params.deletedCount
  entity.timestamp = event.params.timestamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStorageLocked(event: StorageLockedEvent): void {
  let entity = new StorageLocked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStorageUnlocked(event: StorageUnlockedEvent): void {
  let entity = new StorageUnlocked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUnpaused(event: UnpausedEvent): void {
  let entity = new Unpaused(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.account = event.params.account

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWorkflowArchived(event: WorkflowArchivedEvent): void {
  let entity = new WorkflowArchived(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId
  entity.owner = event.params.owner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWorkflowCreated(event: WorkflowCreatedEvent): void {
  let entity = new WorkflowCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.internal_id = event.params.id
  entity.title = event.params.title
  entity.owner = event.params.owner
  entity.schemaId = event.params.schemaId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWorkflowExecutionIntervalUpdated(
  event: WorkflowExecutionIntervalUpdatedEvent
): void {
  let entity = new WorkflowExecutionIntervalUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId
  entity.newInterval = event.params.newInterval

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWorkflowPauseToggled(
  event: WorkflowPauseToggledEvent
): void {
  let entity = new WorkflowPauseToggled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.workflowId = event.params.workflowId
  entity.isPaused = event.params.isPaused

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
