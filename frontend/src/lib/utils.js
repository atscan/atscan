
import { formatDistanceToNow } from 'date-fns';
import { minidenticon } from 'minidenticons';
import numbro from 'numbro';

export function dateDistance (date) {
    return formatDistanceToNow(new Date(date))
}

export function identicon (...args) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(minidenticon(...args))
}

numbro.setDefaults({
    thousandSeparated: true,
    //mantissa: 2
});
export function formatNumber (number) {
    return numbro(number).format()
}