import { ethers } from 'hardhat';
import { getDeployment } from './getDeployment';

/**
 * Get deployment data and constructor arguments
 * See CreateX: https://createx.rocks/deployments
 */
export const deployViaCreateX = async () => {
  const CreateXFactory = '0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed';
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS as string;
  const { data } = await getDeployment();
  const CreateXABI = [
    {
      inputs: [
        { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
        { internalType: 'bytes', name: 'initCode', type: 'bytes' }
      ],
      name: 'deployCreate2',
      outputs: [{ internalType: 'address', name: 'newContract', type: 'address' }],
      stateMutability: 'payable',
      type: 'function'
    }
  ];
  const iface = new ethers.Interface(CreateXABI);
  const encodedData = iface.encodeFunctionData('deployCreate2', [
    ethers.solidityPacked(['address', 'uint8', 'bytes11'], [SAFE_ADDRESS, 0x00, '0xa10f771643cef3d62934f1']),
    data
  ]);
  return { to: CreateXFactory, data: encodedData };
};
