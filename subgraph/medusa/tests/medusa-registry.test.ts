import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { DeviceBlacklisted } from "../generated/schema"
import { DeviceBlacklisted as DeviceBlacklistedEvent } from "../generated/MedusaRegistry/MedusaRegistry"
import { handleDeviceBlacklisted } from "../src/medusa-registry"
import { createDeviceBlacklistedEvent } from "./medusa-registry-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let walletId = "Example string value"
    let deviceAddress = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let blacklister = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let status = "boolean Not implemented"
    let newDeviceBlacklistedEvent = createDeviceBlacklistedEvent(
      walletId,
      deviceAddress,
      blacklister,
      status
    )
    handleDeviceBlacklisted(newDeviceBlacklistedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("DeviceBlacklisted created and stored", () => {
    assert.entityCount("DeviceBlacklisted", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "DeviceBlacklisted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "walletId",
      "Example string value"
    )
    assert.fieldEquals(
      "DeviceBlacklisted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "deviceAddress",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "DeviceBlacklisted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "blacklister",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "DeviceBlacklisted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "status",
      "boolean Not implemented"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
