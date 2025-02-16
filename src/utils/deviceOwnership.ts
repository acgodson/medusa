import { PublicClient } from 'viem';
import { SubgraphDeviceRegistration } from '../types/workflow';

export const checkDeviceOwnership = async (
  publicClient: PublicClient,
  nftContractAddress: string,
  nftContractAbi: any,
  registeredDevices: Set<string>,
  walletAddress: string
): Promise<Record<string, boolean>> => {
  const ownershipCalls = Array.from(registeredDevices).map(deviceAddress => ({
    address: nftContractAddress as `0x${string}`,
    abi: nftContractAbi,
    functionName: "ownsDevice",
    args: [deviceAddress, walletAddress],
  }));

  const ownershipResults = await publicClient.multicall({
    contracts: ownershipCalls as any,
  });

  return Array.from(registeredDevices).reduce((map, deviceAddress, index) => ({
    ...map,
    [deviceAddress]: ownershipResults[index].result,
  }), {});
};