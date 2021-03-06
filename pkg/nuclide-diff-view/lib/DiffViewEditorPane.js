'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {NuclideUri} from '../../commons-node/nuclideUri';
import type {HighlightedLines, OffsetMap, UIElement} from './types';

import {arrayEqual, mapEqual} from '../../commons-node/collection';
import {React} from 'react-for-atom';
import DiffViewEditor from './DiffViewEditor';
import {AtomTextEditor} from '../../nuclide-ui/AtomTextEditor';
import UniversalDisposable from '../../commons-node/UniversalDisposable';
import {Observable} from 'rxjs';
import classnames from 'classnames';
import {
  LoadingSpinner,
  LoadingSpinnerSizes,
} from '../../nuclide-ui/LoadingSpinner';
import {observableFromSubscribeFunction} from '../../commons-node/event';

const SPINNER_DELAY_MS = 50;
const DEBOUNCE_SCROLL_MS = 50;

type Props = {
  filePath: NuclideUri,
  isLoading: boolean,
  textBuffer: atom$TextBuffer,
  offsets: OffsetMap,
  highlightedLines: {
    added: Array<number>,
    removed: Array<number>,
  },
  textContent?: string,
  inlineElements: Array<UIElement>,
  readOnly: boolean,
  onDidChangeScrollTop?: () => mixed,
  onDidUpdateTextEditorElement: () => mixed,
};

export default class DiffViewEditorPane extends React.Component {
  props: Props;

  _diffViewEditor: DiffViewEditor;
  _subscriptions: UniversalDisposable;
  _editorSubscriptions: ?UniversalDisposable;

  constructor(props: Props) {
    super(props);
    this._subscriptions = new UniversalDisposable();
  }

  componentDidMount(): void {
    this._setupDiffEditor();
  }

  _setupDiffEditor(): void {
    const editorSubscriptions = this._editorSubscriptions = new UniversalDisposable();
    this._subscriptions.add(editorSubscriptions);

    const editorDomElement = this.getEditorDomElement();
    this._diffViewEditor = new DiffViewEditor(editorDomElement);
    const textEditor = this.getEditorModel();

    /*
     * Those should have been synced automatically, but an implementation limitation of creating
     * a <atom-text-editor> element assumes default settings for those.
     * Filed: https://github.com/atom/atom/issues/10506
     */
    editorSubscriptions.add(atom.config.observe('editor.tabLength', tabLength => {
      textEditor.setTabLength(tabLength);
    }));
    editorSubscriptions.add(atom.config.observe('editor.softTabs', softTabs => {
      textEditor.setSoftTabs(softTabs);
    }));

    if (this.props.onDidChangeScrollTop != null) {
      editorSubscriptions.add(
        // Debounce for smooth scrolling without hogging the CPU.
        observableFromSubscribeFunction(
          editorDomElement.onDidChangeScrollTop.bind(editorDomElement),
        ).debounceTime(DEBOUNCE_SCROLL_MS)
        .subscribe(this.props.onDidChangeScrollTop),
      );
    }

    this.props.onDidUpdateTextEditorElement();
    // TODO(most): Fix by listening to text editor rendering.
    editorSubscriptions.add(Observable.interval(100).first()
      .subscribe(() => this._setOffsets(this.props.offsets)));
  }

  componentWillUnmount(): void {
    this._subscriptions.dispose();
    this._diffViewEditor.destroy();
  }

  render(): React.Element<any> {
    const {isLoading} = this.props;
    const rootClassName = classnames({
      'nuclide-diff-editor-container': true,
      'nuclide-diff-view-editor-loading': isLoading,
    });

    const loadingIndicator = isLoading
      ? <div className="nuclide-diff-view-pane-loading-indicator">
          <LoadingSpinner delay={SPINNER_DELAY_MS} size={LoadingSpinnerSizes.LARGE} />
        </div>
      : null;

    return (
      <div className={rootClassName}>
        {loadingIndicator}
        <div className="nuclide-diff-editor-wrapper">
          <AtomTextEditor
            _alwaysUpdate={true}
            ref="editor"
            readOnly={this.props.readOnly}
            textBuffer={this.props.textBuffer}
            syncTextContents={false}
          />
        </div>
      </div>
    );
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.textBuffer !== this.props.textBuffer) {
      const oldEditorSubscriptions = this._editorSubscriptions;
      if (oldEditorSubscriptions != null) {
        oldEditorSubscriptions.dispose();
        this._subscriptions.remove(oldEditorSubscriptions);
        this._editorSubscriptions = null;
      }
      this._setupDiffEditor();
    }
    this._updateDiffView(prevProps);
  }

  _updateDiffView(oldProps: Props): void {
    const newProps = this.props;
    const diffEditorUpdated = oldProps.textBuffer !== newProps.textBuffer;
    // The Diff View can never edit the edited buffer contents.
    if (newProps.readOnly &&
      newProps.textContent != null &&
      oldProps.textContent !== newProps.textContent
    ) {
      this._setTextContent(newProps.filePath, newProps.textContent);
    }
    if (diffEditorUpdated || !mapEqual(oldProps.offsets, newProps.offsets)) {
      this._setOffsets(newProps.offsets);
    }
    if (diffEditorUpdated || !arrayEqual(oldProps.inlineElements, newProps.inlineElements)) {
      this._renderComponentsInline(newProps.inlineElements);
    }
    this._setHighlightedLines(newProps.highlightedLines);
  }

  _setTextContent(filePath: string, text: string): void {
    this._diffViewEditor.setFileContents(filePath, text);
  }

  _setHighlightedLines(highlightedLines: HighlightedLines): void {
    this._diffViewEditor.setHighlightedLines(highlightedLines.added, highlightedLines.removed);
  }

  _setOffsets(offsets: OffsetMap): void {
    this._diffViewEditor.setOffsets(offsets);
  }

  _renderComponentsInline(elements: Array<UIElement>): void {
    this._diffViewEditor.setUIElements(elements);
  }

  getEditorModel(): atom$TextEditor {
    return this.refs.editor.getModel();
  }

  getEditorDomElement(): atom$TextEditorElement {
    return this.refs.editor.getElement();
  }
}
