import { describe, expect, it } from 'vitest';
import { EVENT_FAMILIES, type EventFamily, type EventFrameMap, type EventFrame, type ServerFrame, type HostedReportFrame, type OverlayReader } from '../src/index.js';
// These contracts run under the package's strict test typecheck as well as Vitest.
function checkFamilies<T extends true>(_value: T): void {}
checkFamilies<Exclude<EventFamily,keyof EventFrameMap> extends never ? true : false>(true);
checkFamilies<Exclude<keyof EventFrameMap,EventFamily> extends never ? true : false>(true);
function typedCalls(reader: OverlayReader) {
  reader.onEvent('raid', event => {
    const name: string = event.name; const viewers: number | undefined = event.viewers;
    // @ts-expect-error Viewer counts are numeric on the wire.
    const wrong: string = event.viewers;
    void [name,viewers,wrong];
  });
  reader.onEvent('chat',event=>{if(event.op==='message') {const fragments=event.fragments;void fragments;}});
  reader.onEvent('poll',event=>{if(event.event==='begin') {const choices=event.choices;void choices;}});
  void reader.getRecord('nowplaying','current').then(record => {if(record) {const count:number=record.data.queueLength;void count;}});
  // @ts-expect-error A report from a hosted player requires its own source identifier.
  const report: HostedReportFrame = {type:'mediashare',op:'ended',request_id:'request'};
  void report;
}
void typedCalls;
describe('typed wire contracts', () => {
  it('preserves known payloads and additive fields', () => {
    const raid: EventFrame<'raid'>={type:'raid',name:'Raider',viewers:42,future:'kept'};
    const server: ServerFrame=raid;
    expect(server).toEqual({type:'raid',name:'Raider',viewers:42,future:'kept'});
    expect(EVENT_FAMILIES).toHaveLength(33);
  });
});
