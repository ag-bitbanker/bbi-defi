import { ethers } from "hardhat";

export const selector = (signature: object | string): string =>
  ethers.FunctionFragment.from(signature).selector;

export const interfaceId = (signatures: (object | string)[]) =>
  ethers.toBeHex(
    signatures.reduce(
      (acc, signature) => acc ^ ethers.toBigInt(selector(signature)),
      0n
    ),
    4
  );
