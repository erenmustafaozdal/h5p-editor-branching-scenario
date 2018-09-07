import React from 'react';
import PropTypes from 'prop-types';
import './ContentTypeMenu.scss';
import TooltipButton from './TooltipButton';

export default class ContentTypeMenu extends React.Component {

  constructor(props) {
    super(props);

    // TODO: This needs to come from app and needs to be sanitized
    this.l10n = {
      tooltipInfo: 'Add Informational content to the <strong>Branching Question Set.</strong>',
      tooltipBranching: 'Add Branching Question to create a custom path in the <strong>Branching Question Set.</strong>',
      tooltipReuse: 'Add content from the clipboard to the <strong>Branching Question Set.</strong>'
    };

    this.state = {
      canPaste: {
        canPaste: false,
        reason: 'pasteNoContent'
      }
    };
  }

  componentDidMount() {
    H5P.externalDispatcher.on('datainclipboard', () => {
      if (this.props.libraries) {
        this.setCanPaste(this.props.libraries);
      }
    });
  }

  componentWillUnmount() {
    H5P.externalDispatcher.off('datainclipboard');
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.libraries) {
      this.setCanPaste(nextProps.libraries);
    }
  }

  handleMouseDown = (event, library) => {
    if (event.button !== 0) {
      return; // Only handle left click
    }

    // Get library from clipboard
    let defaults;
    if (library === 'reuse') {
      // Inform user if content cannot be pasted
      if (this.state.canPaste.canPaste === false) {
        if (this.state.canPaste.reason === 'pasteTooOld' || this.state.canPaste.reason === 'pasteTooNew') {
          this.confirmPasteError(this.state.canPaste.description, document, () => {});
        }
        else {
          H5PEditor.attachToastTo(
            this.refs['reuse-button'],
            this.state.canPaste.description,
            {position: {
              horizontal: 'center',
              vertical: 'above',
              noOverflowX: true
            }}
          );
        }
      }

      // Sanitization
      const clipboard = H5P.getClipboard();
      if (!clipboard || !clipboard.generic || !clipboard.generic.library) {
        return;
      }

      library = this.props.libraries.find(library => library.name === clipboard.generic.library);
      if (typeof library === 'undefined') {
        return;
      }

      // Pasted Branching Questions should not have next nodes
      if (library.name.indexOf ('H5P.BranchingQuestion ') === 0) {
        clipboard.generic.params.branchingQuestion.alternatives.forEach(alt => {
          alt.nextContentId = -1;
        });
      }

      defaults = {
        params: clipboard.generic.params,
        specific: clipboard.specific
      };
    }

    const raw = event.currentTarget.getBoundingClientRect();
    this.props.onMouseDown({
      target: event.target,
      startX: event.pageX,
      startY: event.pageY,
      position: {
        x: raw.left - 1,
        y: raw.top - 58 // TODO: Determine where offset comes from
      },
      library: library,
      defaults: defaults
    });

    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * set state for canPaste.
   *
   * @param {object} libraries Libraries available.
   */
  setCanPaste = (libraries) => {
    // Transform libraries to expected format
    libraries = libraries.map(lib => {
      const name = lib.name.split(' ')[0];
      lib = H5P.libraryFromString(lib.name);
      lib.name = name;
      return lib;
    });

    this.setState({
      canPaste: H5PEditor.canPastePlus(H5P.getClipboard(), libraries)
    });
  }

  /**
   * Confirm replace if there is content selected.
   *
   * @param {string} message Message.
   * @param {number} top Offset.
   * @param {function} next Next callback.
   */
  confirmPasteError = (message, top, next) => {
    // Confirm changing library
    const confirmReplace = new H5P.ConfirmationDialog({
      headerText: H5PEditor.t('core', 'pasteError'),
      dialogText: message,
      cancelText: ' ',
      confirmText: H5PEditor.t('core', 'ok')
    }).appendTo(document.body);
    confirmReplace.on('confirmed', next);
    confirmReplace.show(top);
  };

  renderDnDButtons() {
    if (!this.props.libraries) {
      return (
        <div className="loading">Loading…</div>
      );
    }

    let listItems = this.props.libraries.map(library => {
      if (library.title === 'BranchingQuestion') {
        return '';
      }

      // TODO: Temporarily excluded, because of crashing the editor for some reason
      if (library.title === 'CoursePresentation') {
        return '';
      }

      let className = library.title.replace(/\s/g, '');
      if (this.props.inserting && this.props.inserting.library === library) {
        className += ' greyout';
      }

      return <li
        key={ Math.random() }
        className={ className }
        onMouseDown={ event => this.handleMouseDown(event, library) }
      >
        { library.title }
      </li>;
    });

    return (
      <ul className="content-type-buttons">
        { listItems }
      </ul>
    );
  }

  renderSecondButtons() {
    if (!this.props.libraries) {
      return (
        <div className="loading">Loading…</div>
      );
    }
    const bs = this.props.libraries.find(library => library.title === 'BranchingQuestion');

    return (
      <ul className="content-type-buttons">
        <li className="branching-question" title="Add New Branching Question" onMouseDown={ event => this.handleMouseDown(event, bs) }>Branching Question</li>
      </ul>
    );
  }

  renderReuseButton() {
    if (!this.props.libraries) {
      return (
        <div className="loading">Loading…</div>
      );
    }

    return (
      <ul className="content-type-buttons">
        <li
          ref={ 'reuse-button' }
          className={ 'reuse-question' + ((!this.state.canPaste.canPaste) ? ' disabled' : '') }
          title="Add from clipboard"
          // TODO: Add toast here when disabled
          onMouseDown={ event => this.handleMouseDown(event, 'reuse') }
        >
          From a clipboard
        </li>
      </ul>
    );
  }

  render() {
    // TODO: Keep width constant during loading. Fix only one loading message for the entire menu?
    return (
      <div className="content-type-menu">
        <label className="label-info">
          Info Content
          <TooltipButton
            text={ this.l10n.tooltipInfo }
            tooltipClass={ 'tooltip below' }
          />
        </label>
        { this.renderDnDButtons() }
        <label className="label-info">
          Branching Content
          <TooltipButton
            text={ this.l10n.tooltipBranching }
          />
        </label>
        { this.renderSecondButtons() }
        <label className="label-info">
          Reuse Content
          <TooltipButton
            text={ this.l10n.tooltipReuse }
          />
        </label>
        { this.renderReuseButton() }
      </div>
    );
  }
}

ContentTypeMenu.propTypes = {
  libraries: PropTypes.array,
  handleMouseDown: PropTypes.func
};
