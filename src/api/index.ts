export * from "./status"

export interface IResponse<T> {
    code: number,
    eTag: string,
    data: T,
}
