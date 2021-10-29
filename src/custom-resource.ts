interface PartialCustomResourceRequest<T> {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  ResourceType: string;
  LogicalResourceId: string;
  ResourceProperties?: Partial<T>
}

export type CreateRequest<T> = PartialCustomResourceRequest<T> & {RequestType: 'Create'};
export type UpdateRequest<T> = PartialCustomResourceRequest<T> & {RequestType: 'Update', PhysicalResourceId: string; OldResourceProperties: Partial<T>};
export type DeleteRequest<T> = PartialCustomResourceRequest<T> & {RequestType: 'Delete', PhysicalResourceId: string};

export type CustomResourceRequest<T> = CreateRequest<T> | UpdateRequest<T> | DeleteRequest<T>;


interface PartialCustomResourceResponse {
  Status: 'SUCCESS' | 'FAILED';
  Reason?: string;
  NoEcho?: boolean;
  Data?: any;
}

export type CustomResourceResponse = PartialCustomResourceResponse & {
  PhysicalResourceId: string;
  StackId: string;
  RequestId: string;
  LogicalResourceId: string;
}

export async function presignedUrlResponder(url: string, response: CustomResourceResponse): Promise<void> {
  await fetch(url, {
    method: 'PUT',
    body: JSON.stringify(response)
  });
}

export class CustomResourceHandler<T> {
  
  constructor(private readonly identifier: string, private readonly respond: (url: string, response: CustomResourceResponse) => Promise<void> = presignedUrlResponder) {
  }
  
  async onCreate(request: CreateRequest<T>): Promise<PartialCustomResourceResponse> {
    return {Status: 'SUCCESS'};
  }
  
  async onUpdate(request: UpdateRequest<T>): Promise<PartialCustomResourceResponse> {
    return {Status: 'SUCCESS'};
  }
  
  async onDelete(request: DeleteRequest<T>): Promise<PartialCustomResourceResponse> {
    return {Status: 'FAILED'};
  }
  
  private async handleWithErrors(request: CustomResourceRequest<T>): Promise<PartialCustomResourceResponse> {
    try {
      switch(request.RequestType) {
        case 'Create': return this.onCreate(request);
        case 'Update': return this.onUpdate(request);
        case 'Delete': return this.onDelete(request);
        default: return {Status: 'FAILED', Reason: 'Could not understand Request Type'};
      }
    } catch(e) {
      console.error(e);
      return {Status: 'FAILED', Reason: 'Unknown Error'};
    }
  }
  
  async handle(request: CustomResourceRequest<T>): Promise<void> {
    const result = await this.handleWithErrors(request);
    await this.respond(request.ResponseURL, {
      ...result,
      PhysicalResourceId: this.identifier,
      RequestId: request.RequestId,
      StackId: request.StackId,
      LogicalResourceId: request.LogicalResourceId
    });
  }
}
