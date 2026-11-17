/**
 * Prisma returns BigInt for columns like MediaAsset.fileSize and
 * PaymentTransaction.amountMinor. JSON.stringify cannot serialize BigInt and
 * throws, which turned some responses (e.g. the admin lesson editor with
 * attached resources) into a 500 error after the data was already saved.
 *
 * Safe integers are sent as numbers, larger values as strings.
 */
declare global {
  interface BigInt {
    toJSON(): number | string;
  }
}

export function enableBigIntJson(): void {
  if (typeof BigInt.prototype.toJSON === 'function') return;

  BigInt.prototype.toJSON = function toJSON(this: bigint): number | string {
    return this <= BigInt(Number.MAX_SAFE_INTEGER) &&
      this >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(this)
      : this.toString();
  };
}
