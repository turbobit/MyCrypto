import { TrezorWallet, TREZOR_MINIMUM_FIRMWARE } from 'libs/wallet';
import React, { PureComponent } from 'react';
import translate, { translateRaw } from 'translations';
import TrezorConnect from 'vendor/trezor-connect';
import DeterministicWalletsModal from './DeterministicWalletsModal';
import UnsupportedNetwork from './UnsupportedNetwork';
import { AppState } from 'reducers';
import { connect } from 'react-redux';
import { SecureWalletName, trezorReferralURL } from 'config';
import { getSingleDPath, getPaths } from 'selectors/config/wallet';
import { PrimaryButton, SecondaryButton } from 'components';
import img from 'assets/images/trezor-illustration.svg';
import './Trezor.scss';

//todo: conflicts with comment in walletDecrypt -> onUnlock method
interface OwnProps {
  onUnlock(param: any): void;
  clearWalletChoice(): void;
}

interface StateProps {
  dPath: DPath | undefined;
  dPaths: DPath[];
}

// todo: nearly duplicates ledger component props
interface State {
  publicKey: string;
  chainCode: string;
  dPath: DPath;
  error: string | null;
  isLoading: boolean;
}

type Props = OwnProps & StateProps;

class TrezorDecryptClass extends PureComponent<Props, State> {
  public state: State = {
    publicKey: '',
    chainCode: '',
    dPath: this.props.dPath || this.props.dPaths[0],
    error: null,
    isLoading: false
  };

  public UNSAFE_componentWillReceiveProps(nextProps: Props) {
    if (this.props.dPath !== nextProps.dPath && nextProps.dPath) {
      this.setState({ dPath: nextProps.dPath });
    }
  }

  public render() {
    const { dPath, publicKey, chainCode, error, isLoading } = this.state;
    const showErr = error ? 'is-showing' : '';

    if (!dPath) {
      return <UnsupportedNetwork walletType={translateRaw('x_Trezor')} />;
    }

    return (
      <div className="TrezorDecrypt">
        <div className="TrezorDecrypt-header">
          <h2 className="TrezorDecrypt-decrypt-title">
            {translate('UNLOCK_DEVICE', { $device: translateRaw('X_TREZOR') })}
          </h2>
        </div>
        {error && (
          <div className={`TrezorDecrypt-error alert alert-danger ${showErr}`}>{error}</div>
        )}
        <img src={img} alt="Trezor illustration" className="TrezorDecrypt-illustration" />

        <p className="TrezorDecrypt-buy">
          Don't have a one?{' '}
          <span>
            <a href={trezorReferralURL}>Order now!</a>
          </span>
        </p>

        <div className="TrezorDecrypt-btn-wrapper">
          <SecondaryButton
            text="Back"
            onClick={this.props.clearWalletChoice}
            className="TrezorDecrypt-btn"
          />
          <div className="flex-spacer" />
          <PrimaryButton
            text="Connect"
            onClick={this.handleNullConnect}
            loading={isLoading}
            loadingTxt={translateRaw('WALLET_UNLOCKING')}
            className="TrezorDecrypt-btn"
          />
        </div>
        <DeterministicWalletsModal
          isOpen={!!publicKey && !!chainCode}
          publicKey={publicKey}
          chainCode={chainCode}
          dPath={dPath}
          dPaths={this.props.dPaths}
          onCancel={this.handleCancel}
          onConfirmAddress={this.handleUnlock}
          onPathChange={this.handlePathChange}
        />
      </div>
    );
  }

  private handlePathChange = (dPath: DPath) => {
    this.setState({ dPath });
    this.handleConnect(dPath);
  };

  private handleConnect = (dPath: DPath): void => {
    this.setState({
      isLoading: true,
      error: null
    });

    (TrezorConnect as any).getXPubKey(
      dPath.value,
      (res: any) => {
        if (res.success) {
          this.setState({
            dPath,
            publicKey: res.publicKey,
            chainCode: res.chainCode,
            isLoading: false
          });
        } else {
          this.setState({
            error: res.error,
            isLoading: false
          });
        }
      },
      TREZOR_MINIMUM_FIRMWARE
    );
  };

  private handleCancel = () => {
    this.reset();
  };

  private handleUnlock = (address: string, index: number) => {
    this.props.onUnlock(new TrezorWallet(address, this.state.dPath.value, index));
    this.reset();
  };

  private handleNullConnect = (): void => {
    this.handleConnect(this.state.dPath);
  };

  private reset() {
    this.setState({
      publicKey: '',
      chainCode: '',
      dPath: this.props.dPath || this.props.dPaths[0]
    });
  }
}

function mapStateToProps(state: AppState): StateProps {
  return {
    dPath: getSingleDPath(state, SecureWalletName.TREZOR),
    dPaths: getPaths(state, SecureWalletName.TREZOR)
  };
}

export const TrezorDecrypt = connect(mapStateToProps)(TrezorDecryptClass);
