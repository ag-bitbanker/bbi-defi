// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { vars } from "hardhat/config";

const owner = vars.get('PUBLIC_KEY')

const bbUsdModule = buildModule("bbUSD", (m) => {
 
  const bbUSD = m.contract("bbUSD",[owner]);
  return { bbUSD };
});

export default bbUsdModule;
