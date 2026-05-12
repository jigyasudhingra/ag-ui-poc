import { dispatchCopilotKitRequest } from '@/lib/copilotkit-endpoint';

export async function GET(req: Request): Promise<Response> {
  return dispatchCopilotKitRequest(req);
}

export async function POST(req: Request): Promise<Response> {
  return dispatchCopilotKitRequest(req);
}

export async function PATCH(req: Request): Promise<Response> {
  return dispatchCopilotKitRequest(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return dispatchCopilotKitRequest(req);
}

export async function OPTIONS(req: Request): Promise<Response> {
  return dispatchCopilotKitRequest(req);
}
