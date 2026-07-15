import Toast from 'react-native-simple-toast';

type ToastMessage = string;

const toastService = {
  success: (msg: ToastMessage): void => {
    Toast.show(msg, Toast.SHORT);
  },

  error: (msg: ToastMessage): void => {
    Toast.show(msg, Toast.LONG);
  },

  info: (msg: ToastMessage): void => {
    Toast.show(msg, Toast.SHORT);
  },

  warning: (msg: ToastMessage): void => {
    Toast.show(msg, Toast.LONG);
  },

  show: (
    msg: ToastMessage,
    duration: number = Toast.SHORT,
  ): void => {
    Toast.show(msg, duration);
  },
};

export default toastService;