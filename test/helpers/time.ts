import { ethers }  from 'hardhat';
import { time, mine, mineUpTo } from '@nomicfoundation/hardhat-network-helpers';
import { mapValues } from './iterate';
import { BigNumberish, BlockTag } from 'ethers';
import { NumberLike } from '@nomicfoundation/hardhat-network-helpers/dist/src/types';

export const clock = {
  blocknumber: () => time.latestBlock().then(ethers.toBigInt),
  timestamp: () => time.latest().then(ethers.toBigInt),
};
export const clockFromReceipt = {
  blocknumber: (receipt: { blockNumber: BigNumberish | Uint8Array; }) => Promise.resolve(ethers.toBigInt(receipt.blockNumber)),
  timestamp: (receipt: { blockNumber: BlockTag; }) => ethers.provider.getBlock(receipt.blockNumber).then(block => ethers.toBigInt(block ? block.timestamp : 0)),
};
export const increaseBy = {
  blockNumber: mine,
  timestamp: (delay: number, mine = true) =>
    time.latest().then(clock => increaseTo.timestamp(clock + ethers.toNumber(delay), mine)),
};
export const increaseTo = {
  blocknumber: mineUpTo,
  timestamp: (to:NumberLike, mine = true) => (mine ? time.increaseTo(to) : time.setNextBlockTimestamp(to)),
};
export const duration = mapValues(time.duration, (fn: (arg0: number) => BigNumberish | Uint8Array) => (n: BigNumberish | Uint8Array) => ethers.toBigInt(fn(ethers.toNumber(n))));
