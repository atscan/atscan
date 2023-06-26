
import { formatDistanceToNow } from 'date-fns';
import { minidenticon } from 'minidenticons';

export function dateDistance (date) {
    return formatDistanceToNow(new Date(date))
}

export function identicon (...args) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(minidenticon(...args))
}