<script>
	import Chart from '$lib/components/Chart.svelte';
	import { goto } from '$app/navigation';

	export let data;

	const pdsMapData = data
		.map((item) => {
			//console.log(item)
			return {
				name: item.host,
				value: item?.ip?.loc
					? [
							...item.ip?.loc?.split(',').reverse(),
							item.didsCount > 10000 ? 18 : item.didsCount > 500 ? 13 : 8,
							item.status
					  ]
					: null
			};
		})
		.filter((i) => i.value);

	const pdsMapChart = {
		//backgroundColor: '',
		/*tooltip: {
			trigger: 'item'
		},*/
		geo: {
			map: 'world',
			left: 0,
			right: 0,
			top: 0,
			zoom: 1,
			silent: true,
			//roam: true,
			itemStyle: {
				normal: {
					areaColor: 'rgba(125, 137, 154, 0.25)',
					borderColor: 'rgba(0, 0, 0, 0)',
					borderWidth: 1
				},
				emphasis: {
					areaColor: '#2a333d'
				}
			}
		},
		series: {
			type: 'effectScatter',
			coordinateSystem: 'geo',
			data: pdsMapData,
			showEffectOn: 'emphasis',
			rippleEffect: {
				brushType: 'stroke'
			},
			encode: {
				value: 2
			},
			label: {
				formatter: '{b}',
				position: 'left'
			},
			emphasis: {
				label: {
					show: true
				}
			},
			itemStyle: {
				color: function ($) {
					const status = $.data.value[3];
					if (status === 'online') {
						return '#22c55e';
					}
					if (status === 'offline') {
						return '#ef4444';
					}
					if (status === 'degraded') {
						return '#f97316';
					}
					return '#71717a';
				},
				shadowColor: '#333'
			},
			symbolSize: function (val) {
				return val[2];
			}
		}
	};

	function onMapClick(ev) {
		const host = ev.detail.data.name;
		if (host) {
			goto(`/pds/${host}`);
		}
	}
</script>

<div class="w-full aspect-video">
	<Chart options={pdsMapChart} on:mapClick={(ev) => onMapClick(ev)} />
</div>
