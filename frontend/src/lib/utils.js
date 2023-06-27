
import { formatDistanceToNow } from 'date-fns';
import { minidenticon } from 'minidenticons';
import { tableSourceValues } from '@skeletonlabs/skeleton';
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

export function customTableMapper (source, keys, process) {
    return tableSourceValues(source.map((row) => {
        const mappedRow = {};
        keys.forEach((key) => { 
            let val = row[key]
            val = process({ row, key, val })
            return mappedRow[key] = val
        })
        return mappedRow;
    }))
}