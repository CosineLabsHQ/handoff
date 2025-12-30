import { ethers } from 'hardhat';

export const deployFixture = async () => {
  const [owner1, relayer1, relayer2, owner2, recipient1, recipient2, user1, user2, attacker] =
    await ethers.getSigners();

  // mocks
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const MockERC20Permit = await ethers.getContractFactory('MockERC20Permit');
  const MockERC20WithFee = await ethers.getContractFactory('MockERC20WithFee');
  const MockERC20PermitWithFee = await ethers.getContractFactory('MockERC20PermitWithFee');
  const MockPermit2 = await ethers.getContractFactory('MockPermit2');

  // deploy tokens
  const token1 = await MockERC20.deploy('Token1', 'TK1', 18);
  const token2 = await MockERC20Permit.deploy('Token2', 'TK2', 18);
  const token3 = await MockERC20WithFee.deploy('Token3', 'TK3', 18, 100);
  const token4 = await MockERC20PermitWithFee.deploy('Token4', 'TK4', 18, 100);
  const permit2 = await MockPermit2.deploy();

  // mints
  await token1.mint(user1.address, ethers.parseUnits('100000', 18));
  await token2.mint(user1.address, ethers.parseUnits('100000', 18));
  await token3.mint(user1.address, ethers.parseUnits('100000', 18));
  await token4.mint(user1.address, ethers.parseUnits('100000', 18));

  await token1.mint(user2.address, ethers.parseUnits('100000', 18));
  await token2.mint(user2.address, ethers.parseUnits('100000', 18));
  await token3.mint(user2.address, ethers.parseUnits('100000', 18));
  await token4.mint(user2.address, ethers.parseUnits('100000', 18));

  const relayers = [relayer1.address];

  // deploy handoff
  const Handoff = await ethers.getContractFactory('Handoff');
  const handoff = await Handoff.deploy(relayers, await permit2.getAddress(), owner1.address);

  return {
    owner1,
    owner2,
    relayer1,
    relayer2,
    recipient1,
    recipient2,
    user1,
    user2,
    attacker,
    token1,
    token2,
    token3,
    token4,
    permit2,
    relayers,
    handoff
  };
};

export const calculateNamespacedTxId = (
  originalTxId: Uint8Array,
  user: string,
  contractAddress: string,
  chainId: bigint
) => {
  return ethers.keccak256(
    ethers.solidityPacked(['bytes32', 'address', 'address', 'uint256'], [originalTxId, user, contractAddress, chainId])
  );
};
