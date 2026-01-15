import { ethers } from 'hardhat';

/**
 * Get deployment data and constructor arguments
 */
export const getDeployment = async () => {
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS as string;
  const Handoff = await ethers.getContractFactory('Handoff');
  const args = {
    relayers: ['0xFcDcD01BCaB08C9551Dd87eF552f3916F9875b12', '0xf3207f8BB31c9c27FaBebFFaeb69F060BfC37171'],
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    owner: SAFE_ADDRESS
  };
  const { data } = await Handoff.getDeployTransaction(args.relayers, args.permit2, args.owner);
  return { data, args };
};
