/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
  * */

/** imports */
import * as vscode from "vscode";
import InteractiveWebviewGenerator from "./features/interactiveWebview";
import PreviewPanel from "./features/previewPanel";
import ColorProvider from "./language/ColorProvider";
import DotCompletionItemProvider from "./language/CompletionItemProvider";
import DotDocumentFormatter from "./language/DocumentFormatter";
import DotHoverProvider from "./language/HoverProvider";
import SymbolProvider from "./language/SymbolProvider";
import * as settings from "./settings";

function onActivate(context: vscode.ExtensionContext) {
  const graphvizView = new InteractiveWebviewGenerator(context);

  /* Document Events */

  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === settings.languageId
        || event.document.fileName.trim().toLowerCase().endsWith(settings.fileExtension)) {
      const panel = graphvizView.getPanel(event.document.uri);
      if (panel) {
        panel.requestRender(event.document.getText());
      }
    }
  }, null, context.subscriptions);

  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
    if (doc.languageId === settings.languageId
        || doc.fileName.trim().toLowerCase().endsWith(settings.fileExtension)) {
      const panel = graphvizView.getPanel(doc.uri);
      if (panel) {
        panel.requestRender(doc.getText());
      }
    }
  }));

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId !== settings.languageId) return;
      if (!settings.extensionConfig().get("openAutomatically")) return;

      vscode.commands.executeCommand("graphviz-interactive-preview.preview.beside", {
        document: doc,
      });
    }),
  );

  /* commands */

  context.subscriptions.push(
    vscode.commands.registerCommand("graphviz-interactive-preview.preview.beside", (a) => {
      // take document or string; default active editor if
      const args = a || {};
      const options = {
        document: args.document,
        uri: args.uri,
        content: args.content,
        callback: args.callback,
        allowMultiplePanels: args.allowMultiplePanels,
        title: args.title,
        search: args.search,
      };

      if (!options.content && !options.document && vscode.window.activeTextEditor?.document) {
        options.document = vscode.window.activeTextEditor.document;
      }

      if (!options.content && options.document) {
        options.content = options.document.getText();
      }

      graphvizView.revealOrCreatePreview(
        vscode.ViewColumn.Beside,
        options.uri ? options.uri : (options.document && options.document.uri),
        options,
      )
        .then((webpanel : PreviewPanel) => {
          // trigger dot render on page load success
          // just in case webpanel takes longer to load, wait for page
          // to ping back and perform action
          // eslint-disable-next-line no-param-reassign
          webpanel.waitingForRendering = options.content;
          // eslint-disable-next-line no-param-reassign
          webpanel.search = options.search;

          // allow caller to handle messages by providing them with the newly created webpanel
          // e.g. caller can override webpanel.handleMessage = function(message){};
          if (options.callback) {
            options.callback(webpanel);
          }
        });
    }),
  );

  /* add. providers */

  if (settings.extensionConfig().codeCompletion.enable as boolean) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
      [settings.languageId],
      new DotCompletionItemProvider(),
      "=",
      "[",
      "{",
      ":",
    ));
  }

  context.subscriptions.push(vscode.languages.registerColorProvider(
    [settings.languageId],
    new ColorProvider(),
  ));

  context.subscriptions.push(vscode.languages.registerHoverProvider(
    [settings.languageId],
    new DotHoverProvider(),
  ));

  const symProvider = new SymbolProvider();
  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
    [settings.languageId],
    symProvider,
  ));
  context.subscriptions.push(vscode.languages.registerRenameProvider(
    [settings.languageId],
    symProvider,
  ));
  context.subscriptions.push(vscode.languages.registerReferenceProvider(
    [settings.languageId],
    symProvider,
  ));
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(
    [settings.languageId],
    new DotDocumentFormatter(),
  ));
}

/* exports */
exports.activate = onActivate;
