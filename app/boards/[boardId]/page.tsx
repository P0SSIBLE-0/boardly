import { BoardEditor } from "@/components/boards/board-editor";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  return <BoardEditor mode="board" boardId={boardId} />;
}
