/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "../../common";

export interface ERC1155ReceiverMockInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "onERC1155BatchReceived"
      | "onERC1155Received"
      | "supportsInterface"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "BatchReceived" | "Received"): EventFragment;

  encodeFunctionData(
    functionFragment: "onERC1155BatchReceived",
    values: [
      AddressLike,
      AddressLike,
      BigNumberish[],
      BigNumberish[],
      BytesLike
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "onERC1155Received",
    values: [AddressLike, AddressLike, BigNumberish, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "supportsInterface",
    values: [BytesLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "onERC1155BatchReceived",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "onERC1155Received",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "supportsInterface",
    data: BytesLike
  ): Result;
}

export namespace BatchReceivedEvent {
  export type InputTuple = [
    operator: AddressLike,
    from: AddressLike,
    ids: BigNumberish[],
    values: BigNumberish[],
    data: BytesLike,
    gas: BigNumberish
  ];
  export type OutputTuple = [
    operator: string,
    from: string,
    ids: bigint[],
    values: bigint[],
    data: string,
    gas: bigint
  ];
  export interface OutputObject {
    operator: string;
    from: string;
    ids: bigint[];
    values: bigint[];
    data: string;
    gas: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ReceivedEvent {
  export type InputTuple = [
    operator: AddressLike,
    from: AddressLike,
    id: BigNumberish,
    value: BigNumberish,
    data: BytesLike,
    gas: BigNumberish
  ];
  export type OutputTuple = [
    operator: string,
    from: string,
    id: bigint,
    value: bigint,
    data: string,
    gas: bigint
  ];
  export interface OutputObject {
    operator: string;
    from: string;
    id: bigint;
    value: bigint;
    data: string;
    gas: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface ERC1155ReceiverMock extends BaseContract {
  connect(runner?: ContractRunner | null): ERC1155ReceiverMock;
  waitForDeployment(): Promise<this>;

  interface: ERC1155ReceiverMockInterface;

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

  onERC1155BatchReceived: TypedContractMethod<
    [
      operator: AddressLike,
      from: AddressLike,
      ids: BigNumberish[],
      values: BigNumberish[],
      data: BytesLike
    ],
    [string],
    "nonpayable"
  >;

  onERC1155Received: TypedContractMethod<
    [
      operator: AddressLike,
      from: AddressLike,
      id: BigNumberish,
      value: BigNumberish,
      data: BytesLike
    ],
    [string],
    "nonpayable"
  >;

  supportsInterface: TypedContractMethod<
    [interfaceId: BytesLike],
    [boolean],
    "view"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "onERC1155BatchReceived"
  ): TypedContractMethod<
    [
      operator: AddressLike,
      from: AddressLike,
      ids: BigNumberish[],
      values: BigNumberish[],
      data: BytesLike
    ],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "onERC1155Received"
  ): TypedContractMethod<
    [
      operator: AddressLike,
      from: AddressLike,
      id: BigNumberish,
      value: BigNumberish,
      data: BytesLike
    ],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "supportsInterface"
  ): TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;

  getEvent(
    key: "BatchReceived"
  ): TypedContractEvent<
    BatchReceivedEvent.InputTuple,
    BatchReceivedEvent.OutputTuple,
    BatchReceivedEvent.OutputObject
  >;
  getEvent(
    key: "Received"
  ): TypedContractEvent<
    ReceivedEvent.InputTuple,
    ReceivedEvent.OutputTuple,
    ReceivedEvent.OutputObject
  >;

  filters: {
    "BatchReceived(address,address,uint256[],uint256[],bytes,uint256)": TypedContractEvent<
      BatchReceivedEvent.InputTuple,
      BatchReceivedEvent.OutputTuple,
      BatchReceivedEvent.OutputObject
    >;
    BatchReceived: TypedContractEvent<
      BatchReceivedEvent.InputTuple,
      BatchReceivedEvent.OutputTuple,
      BatchReceivedEvent.OutputObject
    >;

    "Received(address,address,uint256,uint256,bytes,uint256)": TypedContractEvent<
      ReceivedEvent.InputTuple,
      ReceivedEvent.OutputTuple,
      ReceivedEvent.OutputObject
    >;
    Received: TypedContractEvent<
      ReceivedEvent.InputTuple,
      ReceivedEvent.OutputTuple,
      ReceivedEvent.OutputObject
    >;
  };
}
