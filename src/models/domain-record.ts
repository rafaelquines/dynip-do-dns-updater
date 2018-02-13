export interface DomainRecord {
    id: number;
    type: string;
    name: string;
    data: string;
    priority: number | undefined;
    port: number | undefined;
    ttl: number;
    weight: number | undefined;
    flags: number;
    tag: string;
}