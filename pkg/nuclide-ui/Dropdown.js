'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import {Button, ButtonSizes} from './Button';
import {Icon} from './Icon';
import classnames from 'classnames';
import invariant from 'assert';
import electron from 'electron';
import {React} from 'react-for-atom';

const {remote} = electron;
invariant(remote != null);

// For backwards compat, we have to do some conversion here.
type ShortButtonSize = 'xs' | 'sm' | 'lg';
type ButtonSize = 'EXTRA_SMALL' | 'SMALL' | 'LARGE';

type Separator = {
  type: 'separator',
};

export type Option = Separator | {
  type?: void,
  value: any,
  label: string,
  selectedLabel?: string,
  icon?: atom$Octicon,
  disabled?: boolean,
};

type Props = {
  className: string,
  disabled?: boolean,

  // Normally, a dropdown is styled like a button. This prop allows you to avoid that.
  isFlat: boolean,

  title: string,
  value: any,
  buttonComponent?: ReactClass<any>,
  options: Array<Option>,
  onChange?: (value: any) => mixed,
  size?: ShortButtonSize,
  tooltip?: atom$TooltipsAddOptions,
};

export class Dropdown extends React.Component {
  props: Props;

  static defaultProps = {
    className: '',
    disabled: false,
    isFlat: false,
    options: [],
    value: (null: any),
    title: '',
  };

  constructor(props: Props) {
    super(props);
    (this: any)._handleDropdownClick = this._handleDropdownClick.bind(this);
  }

  _getButtonSize(size: ?ShortButtonSize): ButtonSize {
    switch (size) {
      case 'xs': return 'EXTRA_SMALL';
      case 'sm': return 'SMALL';
      case 'lg': return 'LARGE';
      default: return 'SMALL';
    }
  }

  render(): React.Element<any> {
    const selectedOption = this.props.options.find(option => (
      option.type !== 'separator' && option.value === this.props.value),
    ) || this.props.options[0];

    const ButtonComponent = this.props.buttonComponent || Button;
    const className = classnames(
      'nuclide-ui-dropdown',
      this.props.className,
      {
        'nuclide-ui-dropdown-flat': this.props.isFlat === true,
      },
    );

    return (
      <ButtonComponent
        tooltip={this.props.tooltip}
        size={this._getButtonSize(this.props.size)}
        className={className}
        disabled={this.props.disabled === true}
        onClick={this._handleDropdownClick}>
        {this._renderSelectedLabel(selectedOption)}
        <Icon
          icon="triangle-down"
          className="nuclide-ui-dropdown-icon"
        />
      </ButtonComponent>
    );
  }

  _renderSelectedLabel(option: Option): ?React.Element<any> {
    let text;
    if (option == null) {
      text = '';
    } else if (option.selectedLabel != null) {
      text = option.selectedLabel;
    } else if (option.label != null) {
      text = option.label;
    }

    if (text == null || text === '') { return null; }
    return (
      <span className="nuclide-dropdown-label-text-wrapper">{text}</span>
    );
  }

  _handleDropdownClick(event: SyntheticMouseEvent): void {
    const currentWindow = remote.getCurrentWindow();
    const menu = new remote.Menu();
    this.props.options.forEach(option => {
      if (option.type === 'separator') {
        menu.append(new remote.MenuItem({type: 'separator'}));
        return;
      }
      menu.append(new remote.MenuItem({
        type: 'checkbox',
        checked: this.props.value === option.value,
        label: option.label,
        enabled: option.disabled !== true,
        click: () => {
          if (this.props.onChange != null) {
            this.props.onChange(option.value);
          }
        },
      }));
    });
    menu.popup(currentWindow, event.clientX, event.clientY);
  }

}

export {ButtonSizes};
