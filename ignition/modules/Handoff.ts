import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const HandoffModule = buildModule('HandoffModule', (instance) => {
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS as string;
  const Handoff = instance.contract('Handoff', [
    ['0xFcDcD01BCaB08C9551Dd87eF552f3916F9875b12', '0xf3207f8BB31c9c27FaBebFFaeb69F060BfC37171'],
    '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    SAFE_ADDRESS
  ]);
  return { Handoff };
});

export default HandoffModule;
