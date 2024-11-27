export const Enum = (...options: any) => {
  return Object.fromEntries(
    options.map((key: any, i: string | number | bigint | boolean) => [
      key,
      BigInt(i),
    ])
  );
};

export const ProposalState = Enum(
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed"
);
export const VoteType = Object.assign(Enum("Against", "For", "Abstain"), {
  Parameters: 255n,
});
export const Rounding = Enum("Floor", "Ceil", "Trunc", "Expand");
export const OperationState = Enum("Unset", "Waiting", "Ready", "Done");
export const RevertType = Enum(
  "None",
  "RevertWithoutMessage",
  "RevertWithMessage",
  "RevertWithCustomError",
  "Panic"
);
