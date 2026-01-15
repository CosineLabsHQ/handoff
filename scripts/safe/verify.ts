import { run } from 'hardhat';
import { getDeployment } from './utils/getDeployment';

/**
 * Verification script
 */
async function verify() {
  const DEPLOYED_ADDRESS = process.env.DEPLOYED_ADDRESS;
  const { args } = await getDeployment();
  await run('verify:verify', {
    address: DEPLOYED_ADDRESS,
    constructorArguments: [args.relayers, args.permit2, args.owner]
  });
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Verification failed:');
    console.error(error);
    process.exit(1);
  });
