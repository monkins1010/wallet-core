import { io, Socket } from 'socket.io-client';
import { ActionContext, rootActionContext } from '..';

let socket: Socket;

export const updateMessages = async (
  context: ActionContext,
  { recipient, timestamp, message }: { recipient: string; timestamp: number; message: string }
): Promise<{ recipient: string; timestamp: number; message: string }> => {
  const { state, commit } = rootActionContext(context);
  const { activeWalletId, accounts, activeNetwork } = state;

  const accountData = accounts[activeWalletId]![activeNetwork].find((account) => account.chain === 'ethereum');

  const myAddress = accountData?.addresses[0];

  if (!socket) {
    console.log('in');
    socket = io('https://9dee-85-196-181-2.eu.ngrok.io', {
      reconnectionDelayMax: 10000,
    });
  }

  const _message = { sender: myAddress, recipient, timestamp, message };

  socket.emit('SEND_MESSAGE', { recipient, sender: myAddress, message, timestamp: _message.timestamp });
  commit.UPDATE_MESSAGES({ ..._message });

  socket.on('SEND_MESSAGE_ACK', async (payload) => {
    console.log('SEND_MESSAGE_ACK', payload);
    if (payload.recipient === myAddress) {
      console.log('hit');

      // TODO: get private key
      commit.UPDATE_MESSAGES({ ...payload, recipient: payload.sender });
    }
  });

  return _message;
};
