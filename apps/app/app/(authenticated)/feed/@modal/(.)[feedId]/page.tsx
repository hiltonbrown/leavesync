import { RouteModal } from "../../../components/route-modal";
import { FeedDetailClient } from "./feed-detail-client";

interface FeedDetailModalPageProperties {
  readonly params: Promise<{ feedId: string }>;
}

const FeedDetailModalPage = async ({
  params,
}: FeedDetailModalPageProperties) => {
  const { feedId } = await params;

  return (
    <RouteModal>
      <FeedDetailClient feedId={feedId} />
    </RouteModal>
  );
};

export default FeedDetailModalPage;
