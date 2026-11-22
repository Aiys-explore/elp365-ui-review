(() => {
  'use strict';
  async function clip(url,[start,end],signal){
    const response=await fetch(url,{signal});
    if(!response.ok)throw new Error(`Audio HTTP ${response.status}`);
    const bytes=await response.arrayBuffer();
    const rate=44100;
    const buffer=await new OfflineAudioContext(1,1,rate).decodeAudioData(bytes);
    const offset=Math.round(start*rate);
    const length=Math.min(Math.round((end-start)*rate),buffer.length-offset);
    if(length<=0)throw new Error('Empty dialogue clip');
    const wav=new DataView(new ArrayBuffer(44+length*2));
    const ascii=(offset,s)=>[...s].forEach((ch,i)=>wav.setUint8(offset+i,ch.charCodeAt(0)));
    ascii(0,'RIFF');wav.setUint32(4,36+length*2,true);ascii(8,'WAVEfmt ');
    wav.setUint32(16,16,true);wav.setUint16(20,1,true);wav.setUint16(22,1,true);
    wav.setUint32(24,rate,true);wav.setUint32(28,rate*2,true);
    wav.setUint16(32,2,true);wav.setUint16(34,16,true);
    ascii(36,'data');wav.setUint32(40,length*2,true);
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
    for(let i=0;i<length;i++){
      let sample=0;
      for(const channel of channels)sample+=channel[offset+i];
      sample=Math.max(-1,Math.min(1,sample/channels.length));
      wav.setInt16(44+i*2,sample*(sample<0?32768:32767),true);
    }
    return new Blob([wav],{type:'audio/wav'});
  }
  window.ELP_TRIAL_AUDIO={clip};
})();
