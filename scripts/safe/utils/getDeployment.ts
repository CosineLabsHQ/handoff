import { ethers } from 'hardhat';

/**
 * Get deployment data and constructor arguments
 */
export const getDeployment = async () => {
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS as string;
  const Handoff = await ethers.getContractFactory('Handoff');
  const args = {
    relayers: ['0xE863C8cf377927a27B364b3150f499FbB7595b49', '0xf7c15A0aB4Ce939a7482E2b23Fc79b1E3e95C430'],
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    owner: SAFE_ADDRESS
  };
  const { data } = await Handoff.getDeployTransaction(args.relayers, args.permit2, args.owner);
  return { data, args };
};
