/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "../../common";

export interface FaucetInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "allowedToWithdraw"
      | "requestTokens"
      | "tokenAmount"
      | "tokenInstance"
      | "waitTime"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "allowedToWithdraw",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "requestTokens",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "tokenAmount",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "tokenInstance",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "waitTime", values?: undefined): string;

  decodeFunctionResult(
    functionFragment: "allowedToWithdraw",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "requestTokens",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "tokenAmount",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "tokenInstance",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "waitTime", data: BytesLike): Result;
}

export interface Faucet extends BaseContract {
  connect(runner?: ContractRunner | null): Faucet;
  waitForDeployment(): Promise<this>;

  interface: FaucetInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  allowedToWithdraw: TypedContractMethod<
    [_address: AddressLike],
    [boolean],
    "view"
  >;

  requestTokens: TypedContractMethod<[], [void], "nonpayable">;

  tokenAmount: TypedContractMethod<[], [bigint], "view">;

  tokenInstance: TypedContractMethod<[], [string], "view">;

  waitTime: TypedContractMethod<[], [bigint], "view">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "allowedToWithdraw"
  ): TypedContractMethod<[_address: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "requestTokens"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "tokenAmount"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "tokenInstance"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "waitTime"
  ): TypedContractMethod<[], [bigint], "view">;

  filters: {};
}
