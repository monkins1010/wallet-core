import moment from 'moment';
import { CUSTOM_ERRORS, createInternalError } from '../../modules/error-parser';
import { HistoryItem, SendStatus, TransactionType } from '../store/types';

export const SEND_STATUS_STEP_MAP = {
  [SendStatus.WAITING_FOR_CONFIRMATIONS]: 0,
  [SendStatus.SUCCESS]: 1,
  [SendStatus.FAILED]: 2,
};

export const SEND_STATUS_LABEL_MAP = {
  [SendStatus.WAITING_FOR_CONFIRMATIONS]: 'Pending',
  [SendStatus.SUCCESS]: 'Completed',
  [SendStatus.FAILED]: 'Failed',
};

export function getStatusLabel(item: HistoryItem) {
  if (item.type === TransactionType.NFT) {
    return SEND_STATUS_LABEL_MAP[item.status] || '';
  }
  if (item.type === TransactionType.Send) {
    return SEND_STATUS_LABEL_MAP[item.status] || '';
  }
  return '';
}

export function getStep(item: HistoryItem) {
  const itemType = item.type;
  if (itemType === TransactionType.NFT) {
    return SEND_STATUS_STEP_MAP[item.status];
  }
  if (itemType === TransactionType.Send) {
    return SEND_STATUS_STEP_MAP[item.status];
  }

  throw createInternalError(CUSTOM_ERRORS.Invalid.TransactionType(itemType));
}

export const ACTIVITY_FILTER_TYPES = {
  NFT: {
    label: 'NFT',
    icon: 'nft',
  },
  SEND: {
    label: 'Send',
    icon: 'send',
  },
  RECEIVE: {
    label: 'Receive',
    icon: 'receive',
  },
};

export const ACTIVITY_STATUSES = {
  PENDING: {
    label: 'Pending',
    icon: 'pending',
  },
  COMPLETED: {
    label: 'Completed',
    icon: 'completed',
  },
  FAILED: {
    label: 'Failed',
    icon: 'failed',
  },
  NEEDS_ATTENTION: {
    label: 'Needs Attention',
    icon: 'needs_attention',
  },
  REFUNDED: {
    label: 'Refunded',
    icon: 'refunded',
  },
};

export const SEND_STATUS_FILTER_MAP = {
  WAITING_FOR_CONFIRMATIONS: 'PENDING',
  SUCCESS: 'COMPLETED',
  FAILED: 'FAILED',
};

export const applyActivityFilters = (
  activity: HistoryItem[],
  filters: { types: TransactionType[]; statuses: string[]; dates: { start: string; end: string } }
) => {
  const { types, statuses, dates } = filters;

  let filteredByType = [...activity];
  if (types.length > 0) {
    filteredByType = [...filteredByType].filter((i) => types.includes(i.type));
  }

  let fiteredByStatus = [...filteredByType];
  if (statuses.length > 0) {
    fiteredByStatus = [...fiteredByStatus].filter((i) => {
      if (i.type === 'SEND') {
        return statuses.includes(SEND_STATUS_FILTER_MAP[i.status]);
      }

      return true;
    });
  }

  let filteredByStartDate = [...fiteredByStatus];
  if (dates.start) {
    const startDateFilter = moment(dates.start);
    filteredByStartDate = [...filteredByStartDate].filter((i) => {
      const start = moment(i.startTime);
      const diffInDays = start.diff(startDateFilter, 'days');

      return diffInDays >= 0;
    });
  }

  let filteredByEndDate = [...filteredByStartDate];
  if (dates.end) {
    const endDateFilter = moment(dates.end);
    filteredByEndDate = [...filteredByEndDate].filter((i) => {
      const end = moment(i.startTime);
      const diffInDays = end.diff(endDateFilter, 'days');

      return diffInDays <= 0;
    });
  }

  return filteredByEndDate;
};
