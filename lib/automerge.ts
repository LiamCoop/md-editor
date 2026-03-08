import { Repo, type NetworkAdapter } from "@automerge/automerge-repo";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

const network: NetworkAdapter[] = [new BroadcastChannelNetworkAdapter()];

if (process.env.NEXT_PUBLIC_SYNC_SERVER_URL) {
  network.push(
    new BrowserWebSocketClientAdapter(process.env.NEXT_PUBLIC_SYNC_SERVER_URL)
  );
}

export const repo = new Repo({
  storage: new IndexedDBStorageAdapter(),
  network,
});
