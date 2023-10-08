import { useMemo, useRef } from "react";
import React from "react";
import type { WebViewProps } from "react-native-webview";
import WebView from "react-native-webview";

import type { Procedure, ProceduresObject } from "./integrations";
import {
  handleBridge,
  handleLog,
  INTEGRATIONS_SCRIPTS_BRIDGE,
  INTEGRATIONS_SCRIPTS_CONSOLE,
} from "./integrations";

type CreateWebviewArgs = {
  bridge: ProceduresObject<Record<string, Procedure>>;
  host: string;
  debug?: boolean;
};

export const createWebview = ({ bridge, host, debug }: CreateWebviewArgs) => {
  return {
    Webview: (props: Omit<WebViewProps, "source">) => {
      const webviewRef = useRef<WebView>(null);

      const bridgeNames = useMemo(
        () =>
          Object.values(bridge ?? {}).map((func) => {
            return `'${func.name}'`;
          }),
        [],
      );

      return (
        <WebView
          ref={webviewRef}
          source={{ uri: host }}
          onMessage={async (event) => {
            props.onMessage?.(event);

            const { method, args, type, eventId } = JSON.parse(
              event.nativeEvent.data,
            );

            switch (type) {
              case "log":
                debug && handleLog(method, args);
                return;
              case "bridge":
                webviewRef.current &&
                  handleBridge({
                    bridge,
                    method,
                    args,
                    eventId,
                    webview: webviewRef.current,
                  });
                return;
            }
          }}
          injectedJavaScriptBeforeContentLoaded={[
            INTEGRATIONS_SCRIPTS_BRIDGE(bridgeNames),
            props.injectedJavaScriptBeforeContentLoaded,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
          injectedJavaScript={[
            console && INTEGRATIONS_SCRIPTS_CONSOLE,
            props.injectedJavaScript,
            "true;",
          ]
            .filter(Boolean)
            .join("\n")}
          {...props}
        />
      );
    },
  };
};
