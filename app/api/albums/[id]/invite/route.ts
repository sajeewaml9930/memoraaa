import { NextRequest } from "next/server";
import { POST as createAlbumInvite } from "@/app/api/share/album/[albumId]/route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return createAlbumInvite(request, { params: Promise.resolve({ albumId: id }) });
}
