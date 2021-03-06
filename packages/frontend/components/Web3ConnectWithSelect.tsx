import { Web3ReactHooks } from "@web3-react/core";
import { MetaMask } from "@web3-react/metamask";
import { Network } from "@web3-react/network";
import { useCallback, useState } from "react";
import { CHAINS, getAddChainParameters, URLS } from "../chains";
import { Select, Box } from "@chakra-ui/react";
import { metaMask, hooks as metaMaskHooks } from "../connectors/metaMask";
import { useSWRConfig } from "swr";

interface Web3ConnectProps {
  connector: MetaMask | Network;
  chainId: ReturnType<Web3ReactHooks["useChainId"]>;
  setError: (error: Error | undefined) => void;
}

interface ChainSelectProps {
  chainId: number;
  switchChain: (chainId: number) => void | undefined;
  displayDefault: boolean;
  chainIds: number[];
}

function ChainSelect({
  chainId,
  switchChain,
  displayDefault,
  chainIds,
}: ChainSelectProps) {
  return (
    <Select
      value={chainId}
      onChange={(event) => {
        switchChain?.(Number(event.target.value));
      }}
      disabled={switchChain === undefined}
    >
      {displayDefault ? <option value={-1}>Default Chain</option> : null}
      {chainIds.map((chainId) => (
        <option key={chainId} value={chainId}>
          {CHAINS[chainId]?.name ?? chainId}
        </option>
      ))}
    </Select>
  );
}

export default function Web3ConnectWithSelect({
  connector,
  chainId,
  setError,
}: Web3ConnectProps) {
  const { cache } = useSWRConfig();
  const isNetwork = connector instanceof Network;
  const displayDefault = !isNetwork;
  const { useAccount } = metaMaskHooks;
  const account = useAccount();

  const chainIds = isNetwork
    ? Object.keys(URLS).map((chainId) => Number(chainId))
    : Object.keys(CHAINS).map((chainId) => Number(chainId));

  //TODO: the default network is Mumbai
  const [desiredChainId, setDesiredChainId] = useState<number>(
    isNetwork ? 80001 : -1
  );

  const switchChain = useCallback(
    (desiredChainId: number) => {
      setDesiredChainId(desiredChainId);

      // if we're already connected to the desired chain, return
      if (desiredChainId === chainId) return;

      // if they want to connect to the default chain and we're already connected, return
      if (desiredChainId === -1 && chainId !== undefined) return;

      (cache as any).clear();

      if (connector instanceof Network) {
        connector
          .activate(desiredChainId === -1 ? undefined : desiredChainId)
          .then(() => setError(undefined))
          .catch(setError);

        if (account) {
          metaMask
            .activate(
              desiredChainId === -1
                ? undefined
                : getAddChainParameters(desiredChainId)
            )
            .then(() => setError(undefined))
            .catch(setError);
        }
      } else {
        connector
          .activate(
            desiredChainId === -1
              ? undefined
              : getAddChainParameters(desiredChainId)
          )
          .then(() => setError(undefined))
          .catch(setError);
      }
    },
    [connector, chainId, setError, account]
  );

  return (
    <Box>
      <ChainSelect
        chainId={desiredChainId}
        switchChain={switchChain}
        displayDefault={displayDefault}
        chainIds={chainIds}
      />
    </Box>
  );
}
