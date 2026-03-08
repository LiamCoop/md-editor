import { Repo, type NetworkAdapter } from "@automerge/automerge-repo";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

let cachedRepo: Repo | null = null;

export function getRepo(): Repo {
  if (cachedRepo) {
    return cachedRepo;
  }
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("Automerge repo must be initialized in the browser.");
  }

  const network: NetworkAdapter[] = [new BroadcastChannelNetworkAdapter()];
  if (process.env.NEXT_PUBLIC_SYNC_SERVER_URL) {
    network.push(
      new BrowserWebSocketClientAdapter(process.env.NEXT_PUBLIC_SYNC_SERVER_URL),
    );
  }

  cachedRepo = new Repo({
    storage: new IndexedDBStorageAdapter(),
    network,
  });
  return cachedRepo;
}
