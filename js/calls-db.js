/**
 * GradRight calls database
 * Built from connected people. Regenerate: python3 scripts/build-calls-db.py
 */
(function () {
  var CALLS_CSV = "id,person_id,service,day,time,mins,status\nc-pef5ab5aa,pef5ab5aa,College shortlisting,2026-09-23,10:00,30,done\nc-p689c538b,p689c538b,SOP review,2026-09-23,10:45,45,done\nc-p763e2c28,p763e2c28,Visa readiness,2026-09-23,11:30,60,done\nc-pb48b418d,pb48b418d,Pathway consult,2026-09-23,12:15,30,done\nc-p0368e4cb,p0368e4cb,Essay workshop,2026-09-23,13:00,45,done\nc-p6748ac36,p6748ac36,Applications,2026-09-23,13:40,60,done\nc-p6f3dd9d6,p6f3dd9d6,Essay workshop,2026-09-23,14:00,30,done\nc-pa111b0e8,pa111b0e8,College shortlisting,2026-09-23,14:45,45,done\nc-p2aa020c2,p2aa020c2,SOP review,2026-09-23,15:15,60,done\nc-pb0206def,pb0206def,Visa readiness,2026-09-23,16:00,30,done\nc-pf83dc512,pf83dc512,Pathway consult,2026-09-23,16:45,45,done\nc-pb7629586,pb7629586,Essay workshop,2026-09-23,17:30,60,done\nc-pf0120b91,pf0120b91,Parent consult,2026-09-23,18:00,30,upcoming\nc-p8e100e7b,p8e100e7b,Parent consult,2026-09-23,18:45,45,upcoming\nc-pfdb9975d,pfdb9975d,College shortlisting,2026-09-23,19:30,60,upcoming\nc-p1bdade64,p1bdade64,SOP review,2026-09-23,10:00,30,done\nc-pf5672f4d,pf5672f4d,Visa readiness,2026-09-23,10:45,45,done\nc-pb42031d3,pb42031d3,Pathway consult,2026-09-23,11:30,60,done\nc-p165009cb,p165009cb,Parent consult,2026-09-23,12:15,30,done\nc-pa6942f57,pa6942f57,College shortlisting,2026-09-23,13:00,45,done\nc-p32e9f6a4,p32e9f6a4,Parent consult,2026-09-22,13:40,60,done\nc-p1ed6b161,p1ed6b161,Parent consult,2026-09-22,14:00,30,done\nc-pd9aec628,pd9aec628,Pathway consult,2026-09-22,14:45,45,done\nc-p757cd7d8,p757cd7d8,Visa readiness,2026-09-21,15:15,60,done\nc-pdb10ec9d,pdb10ec9d,Parent consult,2026-09-21,16:00,30,done\nc-pa9149edf,pa9149edf,Essay workshop,2026-09-21,16:45,45,done\nc-p5b9bd833,p5b9bd833,Parent consult,2026-09-21,17:30,60,done\nc-p540c5229,p540c5229,SOP review,2026-09-21,18:00,30,done\nc-pf007bdc1,pf007bdc1,Visa readiness,2026-09-21,18:45,45,done\nc-pecb9a9f0,pecb9a9f0,SOP review,2026-09-21,19:30,60,done\nc-p287dfc1a,p287dfc1a,Visa readiness,2026-09-21,10:00,30,done\nc-p2198461e,p2198461e,Pathway consult,2026-09-20,10:45,45,done\nc-p13af1998,p13af1998,Essay workshop,2026-09-19,11:30,60,done\nc-pc2635068,pc2635068,Applications,2026-09-19,12:15,30,done\nc-p391ef1db,p391ef1db,Essay workshop,2026-09-19,13:00,45,done\nc-pae8a099d,pae8a099d,Visa readiness,2026-09-19,13:40,60,done\nc-pd159409a,pd159409a,SOP review,2026-09-19,14:00,30,done\nc-pe1f4bffa,pe1f4bffa,Visa readiness,2026-09-18,14:45,45,done\nc-p5f630940,p5f630940,Pathway consult,2026-09-18,15:15,60,done\nc-sohan,sohan,Essay workshop,2026-09-18,16:00,30,done\nc-ped462f71,ped462f71,Applications,2026-09-22,16:45,45,done\nc-pd5b97457,pd5b97457,Visa readiness,2026-09-21,17:30,60,done\nc-p1aaac365,p1aaac365,Pathway consult,2026-09-20,18:00,30,done\nc-p0ccde525,p0ccde525,SOP review,2026-09-19,18:45,45,done\nc-pbd453686,pbd453686,Visa readiness,2026-09-18,19:30,60,done\nc-p7a475f08,p7a475f08,SOP review,2026-09-17,10:00,30,done\nc-p17366e1b,p17366e1b,Parent consult,2026-09-16,10:45,45,done\nc-p83ddf922,p83ddf922,Applications,2026-09-15,11:30,60,done\nc-p636647e0,p636647e0,Visa readiness,2026-09-14,12:15,30,done\nc-p663ada87,p663ada87,College shortlisting,2026-09-13,13:00,45,done\nc-pd9cd4f19,pd9cd4f19,Parent consult,2026-09-13,13:40,60,done\nc-p707a552a,p707a552a,Visa readiness,2026-09-13,14:00,30,done\nc-p43ea7db0,p43ea7db0,Pathway consult,2026-09-12,14:45,45,done\nc-p9169ca7f,p9169ca7f,Pathway consult,2026-09-12,15:15,60,done\nc-aarav,aarav,College shortlisting,2026-09-12,16:00,30,done\nc-p7b5c4589,p7b5c4589,Parent consult,2026-09-12,16:45,45,done\nc-pf1c75d48,pf1c75d48,College shortlisting,2026-09-12,17:30,60,done\nc-p5c7331cc,p5c7331cc,Parent consult,2026-09-11,18:00,30,done\nc-kabir,kabir,Applications,2026-09-10,18:45,45,done\nc-p103aa5cd,p103aa5cd,Pathway consult,2026-09-10,19:30,60,done\nc-p0813ed73,p0813ed73,Essay workshop,2026-09-10,10:00,30,done\nc-pea2961dc,pea2961dc,SOP review,2026-09-09,10:45,45,done\nc-p88924ce2,p88924ce2,Essay workshop,2026-09-09,11:30,60,done\nc-p46b78d33,p46b78d33,College shortlisting,2026-09-09,12:15,30,done\nc-p24c2a927,p24c2a927,SOP review,2026-09-09,13:00,45,done\nc-pc773ae97,pc773ae97,Pathway consult,2026-09-08,13:40,60,done\nc-ravi,ravi,Pathway consult,2026-09-08,14:00,30,done\nc-p6e435801,p6e435801,Essay workshop,2026-09-08,14:45,45,done\nc-p8e7f7db6,p8e7f7db6,Essay workshop,2026-09-08,15:15,60,done\nc-p11435c17,p11435c17,Parent consult,2026-09-08,16:00,30,done\nc-p70915418,p70915418,Pathway consult,2026-09-07,16:45,45,done\nc-pd9723eb6,pd9723eb6,SOP review,2026-09-07,17:30,60,done\nc-p7d94a0b8,p7d94a0b8,Visa readiness,2026-09-07,18:00,30,done\nc-pd74fefb0,pd74fefb0,Parent consult,2026-09-07,18:45,45,done\nc-p67b05b30,p67b05b30,Essay workshop,2026-09-06,19:30,60,done\nc-p81d1a7d8,p81d1a7d8,Parent consult,2026-09-06,10:00,30,done\nc-pe6de1504,pe6de1504,Parent consult,2026-09-06,10:45,45,done\nc-pd2489bf9,pd2489bf9,College shortlisting,2026-09-05,11:30,60,done\nc-p4e46f5b2,p4e46f5b2,Visa readiness,2026-09-05,12:15,30,done\nc-peda519a0,peda519a0,Visa readiness,2026-09-05,13:00,45,done\nc-p70d0af6e,p70d0af6e,Pathway consult,2026-09-22,13:40,60,done\nc-p8f5d0a91,p8f5d0a91,Pathway consult,2026-09-21,14:00,30,done\nc-p401bb7cc,p401bb7cc,Applications,2026-09-20,14:45,45,done\nc-pf990a184,pf990a184,Parent consult,2026-09-19,15:15,60,done\nc-pa16457ac,pa16457ac,Essay workshop,2026-09-18,16:00,30,done\nc-p586c40a5,p586c40a5,SOP review,2026-09-17,16:45,45,done\nc-meera,meera,SOP review,2026-09-16,17:30,60,done\nc-pc724f5ce,pc724f5ce,SOP review,2026-09-15,18:00,30,done\nc-p1bed3e02,p1bed3e02,Essay workshop,2026-09-14,18:45,45,done\nc-p9bb72e41,p9bb72e41,Applications,2026-09-13,19:30,60,done\nc-p15982c72,p15982c72,Parent consult,2026-09-12,10:00,30,done\nc-pfa9ae4c6,pfa9ae4c6,Pathway consult,2026-09-11,10:45,45,done\nc-p2ed51c57,p2ed51c57,SOP review,2026-09-10,11:30,60,done\nc-p9051c19e,p9051c19e,Visa readiness,2026-09-09,12:15,30,done\nc-pee4d241f,pee4d241f,Pathway consult,2026-09-08,13:00,45,done\nc-pb3e1a384,pb3e1a384,Essay workshop,2026-09-07,13:40,60,done\nc-p85ede5f6,p85ede5f6,SOP review,2026-09-06,14:00,30,done\nc-p80ea866a,p80ea866a,Parent consult,2026-09-05,14:45,45,done\nc-p9809226d,p9809226d,Pathway consult,2026-09-04,15:15,60,done\nc-pe19a0eef,pe19a0eef,SOP review,2026-09-03,16:00,30,done\nc-p7d941751,p7d941751,Visa readiness,2026-09-02,16:45,45,done\nc-pc0806cf1,pc0806cf1,SOP review,2026-09-01,17:30,60,done\nc-p3ff4014a,p3ff4014a,Parent consult,2026-08-31,18:00,30,done\nc-p77f7cc8a,p77f7cc8a,Pathway consult,2026-08-30,18:45,45,done\nc-p41f44a6e,p41f44a6e,College shortlisting,2026-08-29,19:30,60,done\nc-pdc369e2f,pdc369e2f,Pathway consult,2026-08-29,10:00,30,done\nc-p1ed58b32,p1ed58b32,SOP review,2026-08-28,10:45,45,done\nc-p91b2fe2b,p91b2fe2b,Visa readiness,2026-08-28,11:30,60,done\nc-p6cf2bb91,p6cf2bb91,Pathway consult,2026-08-28,12:15,30,done\nc-p1a46524b,p1a46524b,Visa readiness,2026-08-27,13:00,45,done\nc-p42d4a5ad,p42d4a5ad,College shortlisting,2026-08-26,13:40,60,done\nc-p8b3bfcbd,p8b3bfcbd,Parent consult,2026-08-26,14:00,30,done\nc-pd28f8c6d,pd28f8c6d,College shortlisting,2026-08-26,14:45,45,done\nc-p0de666ad,p0de666ad,College shortlisting,2026-08-25,15:15,60,done\nc-p8e5aa9bd,p8e5aa9bd,College shortlisting,2026-08-24,16:00,30,done\nc-p1cfe10d1,p1cfe10d1,Pathway consult,2026-08-23,16:45,45,done\nc-p0ace65cc,p0ace65cc,Pathway consult,2026-08-23,17:30,60,done\nc-p720f3387,p720f3387,Applications,2026-08-23,18:00,30,done\nc-p5979d875,p5979d875,Parent consult,2026-08-23,18:45,45,done\nc-pd724f7e7,pd724f7e7,College shortlisting,2026-08-22,19:30,60,done\nc-p752f535e,p752f535e,Pathway consult,2026-09-22,10:00,30,done\nc-p834c38e0,p834c38e0,Visa readiness,2026-09-21,10:45,45,done\nc-p957306f4,p957306f4,Pathway consult,2026-09-20,11:30,60,done\nc-p657b4a31,p657b4a31,Essay workshop,2026-09-19,12:15,30,done\nc-pce140c21,pce140c21,Applications,2026-09-18,13:00,45,done\nc-p23056710,p23056710,Parent consult,2026-09-17,13:40,60,done\nc-p2733553a,p2733553a,Pathway consult,2026-09-16,14:00,30,done\nc-p64ead05b,p64ead05b,SOP review,2026-09-15,14:45,45,done\nc-pb4113ce7,pb4113ce7,Visa readiness,2026-09-14,15:15,60,done\nc-p629a4c8b,p629a4c8b,Pathway consult,2026-09-13,16:00,30,done\nc-pa9856d98,pa9856d98,Essay workshop,2026-09-12,16:45,45,done\nc-p0952019a,p0952019a,Applications,2026-09-11,17:30,60,done\nc-rohan,rohan,Visa readiness,2026-09-10,18:00,30,done\nc-pf5cf3583,pf5cf3583,College shortlisting,2026-09-09,18:45,45,done\nc-p363a77c9,p363a77c9,Visa readiness,2026-09-08,19:30,60,done\nc-p7430ef89,p7430ef89,Visa readiness,2026-09-07,10:00,30,done\nc-p2853750c,p2853750c,Pathway consult,2026-09-06,10:45,45,done\nc-p202e8d62,p202e8d62,SOP review,2026-09-05,11:30,60,done\nc-p958037ff,p958037ff,Applications,2026-09-04,12:15,30,done\nc-pffc096fe,pffc096fe,Parent consult,2026-09-03,13:00,45,done\nc-p709f17ec,p709f17ec,SOP review,2026-09-02,13:40,60,done\nc-pbd568281,pbd568281,SOP review,2026-09-01,14:00,30,done\nc-pcafa803e,pcafa803e,Visa readiness,2026-08-31,14:45,45,done\nc-pc01a0c8d,pc01a0c8d,College shortlisting,2026-08-30,15:15,60,done\nc-p0b487b70,p0b487b70,Visa readiness,2026-08-29,16:00,30,done\nc-p05656c1e,p05656c1e,Pathway consult,2026-08-28,16:45,45,done\nc-pba82f920,pba82f920,Parent consult,2026-08-27,17:30,60,done\nc-pfa28a0ec,pfa28a0ec,Essay workshop,2026-08-26,18:00,30,done\nc-pee15cbfa,pee15cbfa,SOP review,2026-08-25,18:45,45,done\nc-pfe2cb5a3,pfe2cb5a3,Visa readiness,2026-08-24,19:30,60,done\nc-p9b493e15,p9b493e15,College shortlisting,2026-08-23,10:00,30,done\nc-pe54d7ffd,pe54d7ffd,Essay workshop,2026-08-22,10:45,45,done\nc-p78194bca,p78194bca,Applications,2026-08-21,11:30,60,done\nc-p371a588f,p371a588f,Parent consult,2026-08-20,12:15,30,done\nc-p403d46a9,p403d46a9,College shortlisting,2026-08-19,13:00,45,done\nc-p469ad4f9,p469ad4f9,Visa readiness,2026-08-18,13:40,60,done\nc-pda7d5db7,pda7d5db7,Visa readiness,2026-08-17,14:00,30,done\nc-pb7d83896,pb7d83896,Pathway consult,2026-08-16,14:45,45,done\nc-p717901ee,p717901ee,Essay workshop,2026-08-15,15:15,60,done\nc-pd401accb,pd401accb,Essay workshop,2026-08-14,16:00,30,done\nc-p56f3f7cf,p56f3f7cf,Pathway consult,2026-09-22,16:45,45,done\nc-p25b72e6d,p25b72e6d,College shortlisting,2026-09-21,17:30,60,done\nc-pd29b92f1,pd29b92f1,SOP review,2026-09-20,18:00,30,done\nc-p09ebde1a,p09ebde1a,Visa readiness,2026-09-19,18:45,45,done\nc-pbbdc9758,pbbdc9758,Pathway consult,2026-09-18,19:30,60,done\nc-p4da68559,p4da68559,Parent consult,2026-09-17,10:00,30,done\nc-p8156ced0,p8156ced0,Applications,2026-09-16,10:45,45,done\nc-pe6398d1e,pe6398d1e,Parent consult,2026-09-15,11:30,60,done\nc-p502c0062,p502c0062,Pathway consult,2026-09-14,12:15,30,done\nc-ped29dab0,ped29dab0,SOP review,2026-09-13,13:00,45,done\nc-pa55c9728,pa55c9728,Visa readiness,2026-09-12,13:40,60,done\nc-p2b8ca32f,p2b8ca32f,Pathway consult,2026-09-11,14:00,30,done\nc-p3d05c26c,p3d05c26c,Essay workshop,2026-09-10,14:45,45,done\nc-p390d15ac,p390d15ac,Applications,2026-09-09,15:15,60,done\nc-p4b2be8f5,p4b2be8f5,Parent consult,2026-09-08,16:00,30,done\nc-p337ca26f,p337ca26f,College shortlisting,2026-09-07,16:45,45,done\nc-p0345be28,p0345be28,SOP review,2026-09-06,17:30,60,done\nc-p2d20a353,p2d20a353,Visa readiness,2026-09-05,18:00,30,done\nc-p4dadd7c1,p4dadd7c1,Pathway consult,2026-09-04,18:45,45,done\nc-pb5fb6ede,pb5fb6ede,Essay workshop,2026-09-03,19:30,60,done\nc-pa887b3c1,pa887b3c1,Applications,2026-09-02,10:00,30,done\nc-pb1f62faf,pb1f62faf,SOP review,2026-09-01,10:45,45,done\nc-pd4d5ec7c,pd4d5ec7c,College shortlisting,2026-08-31,11:30,60,done\nc-p041854b2,p041854b2,SOP review,2026-08-30,12:15,30,done\nc-p1cb88c82,p1cb88c82,Visa readiness,2026-08-29,13:00,45,done\nc-p26b9bac8,p26b9bac8,Pathway consult,2026-08-28,13:40,60,done\nc-pe715294e,pe715294e,Pathway consult,2026-08-27,14:00,30,done\nc-pc5344db5,pc5344db5,Applications,2026-08-26,14:45,45,done\nc-pb136cfe1,pb136cfe1,Parent consult,2026-08-25,15:15,60,done\nc-pe370b4e2,pe370b4e2,College shortlisting,2026-08-24,16:00,30,done\nc-peb642662,peb642662,SOP review,2026-08-23,16:45,45,done\nc-p6d0727f4,p6d0727f4,Visa readiness,2026-08-22,17:30,60,done\nc-pb78aa123,pb78aa123,Parent consult,2026-08-21,18:00,30,done\nc-p6fcc8bcd,p6fcc8bcd,College shortlisting,2026-08-20,18:45,45,done\nc-p9b0c63fd,p9b0c63fd,Applications,2026-08-19,19:30,60,done\nc-p3623063c,p3623063c,Pathway consult,2026-08-18,10:00,30,done\nc-pc49cef5f,pc49cef5f,Parent consult,2026-08-17,10:45,45,done\nc-pef8b9a35,pef8b9a35,SOP review,2026-08-16,11:30,60,done\nc-p15bcb671,p15bcb671,Visa readiness,2026-08-15,12:15,30,done\nc-p1ad9fd15,p1ad9fd15,Pathway consult,2026-08-14,13:00,45,done\nc-p042b7f0f,p042b7f0f,Essay workshop,2026-09-22,13:40,60,done\nc-pc4199743,pc4199743,Parent consult,2026-09-21,14:00,30,done\nc-p1feed169,p1feed169,Essay workshop,2026-09-20,14:45,45,done\nc-pc0fd4fa1,pc0fd4fa1,College shortlisting,2026-09-19,15:15,60,done\nc-pa8c5e407,pa8c5e407,Essay workshop,2026-09-18,16:00,30,done\nc-p77e86d60,p77e86d60,Visa readiness,2026-09-17,16:45,45,done\nc-pfc1ccff2,pfc1ccff2,College shortlisting,2026-09-16,17:30,60,done\nc-p35f9b8c2,p35f9b8c2,Essay workshop,2026-09-15,18:00,30,done\nc-p9cc9c231,p9cc9c231,SOP review,2026-09-14,18:45,45,done\nc-p973b00fa,p973b00fa,Parent consult,2026-09-13,19:30,60,done\nc-p3655522f,p3655522f,College shortlisting,2026-09-12,10:00,30,done\nc-pc67883ac,pc67883ac,SOP review,2026-09-11,10:45,45,done\nc-p5e447b84,p5e447b84,Visa readiness,2026-09-10,11:30,60,done\nc-pbaff50b3,pbaff50b3,Pathway consult,2026-09-09,12:15,30,done\nc-p2e0295e6,p2e0295e6,Essay workshop,2026-09-08,13:00,45,done\nc-p0ea82a87,p0ea82a87,SOP review,2026-09-07,13:40,60,done\nc-jia,jia,Parent consult,2026-09-06,14:00,30,done\nc-pe9e21a24,pe9e21a24,Visa readiness,2026-09-05,14:45,45,done\nc-p8b1a36d5,p8b1a36d5,SOP review,2026-09-04,15:15,60,done\nc-pd8a9d0fd,pd8a9d0fd,Pathway consult,2026-09-03,16:00,30,done\nc-p56fc3905,p56fc3905,Pathway consult,2026-09-02,16:45,45,done\nc-pb2d15a13,pb2d15a13,Parent consult,2026-09-01,17:30,60,done\nc-p539aaf9a,p539aaf9a,College shortlisting,2026-08-31,18:00,30,done\nc-p3094bd32,p3094bd32,Parent consult,2026-08-30,18:45,45,done\nc-pe37491dd,pe37491dd,College shortlisting,2026-08-29,19:30,60,done\nc-p77e63c9d,p77e63c9d,SOP review,2026-08-28,10:00,30,done\nc-p24c26449,p24c26449,Visa readiness,2026-08-27,10:45,45,done\nc-pcec5d40f,pcec5d40f,Pathway consult,2026-08-26,11:30,60,done\nc-p7b6c4c76,p7b6c4c76,Parent consult,2026-08-25,12:15,30,done\nc-tanvi,tanvi,Essay workshop,2026-08-24,13:00,45,done\nc-ananya,ananya,Pathway consult,2026-08-23,13:40,60,done\n";

  function parseCsv(text) {
    var rows = [];
    var i = 0, field = '', row = [], inQ = false;
    text = String(text || '').replace(/^\uFEFF/, '');
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0]) rows.push(row);
        row = [];
      } else field += c;
      i++;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    var headers = rows[0];
    return rows.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) { o[h] = r[idx] == null ? '' : r[idx]; });
      return o;
    });
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function bookedOnFor(id, day) {
    var seed = 0;
    String(id || '').split('').forEach(function (ch) {
      seed += ch.charCodeAt(0);
    });
    var parts = String(day || todayKey).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() - (1 + (seed % 3)));
    var h = 9 + (seed % 9);
    var m = [0, 10, 15, 20, 30, 40, 45][seed % 7];
    return (
      d.getFullYear() +
      '-' +
      pad2(d.getMonth() + 1) +
      '-' +
      pad2(d.getDate()) +
      ' ' +
      pad2(h) +
      ':' +
      pad2(m)
    );
  }

  var todayKey = '2026-09-23';
  var list = parseCsv(CALLS_CSV).map(function (r) {
    var person = (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[r.person_id]) || {};
    return {
      id: r.id,
      personId: r.person_id,
      name: person.name || r.person_id,
      initials: person.initials || '•',
      amber: !!person.amber,
      role: person.role || (String(r.service || '').toLowerCase().indexOf('parent') >= 0 ? 'parent' : 'student'),
      service: r.service || person.service || 'Consult',
      day: r.day,
      time: r.time,
      mins: Number(r.mins) || 30,
      status: r.status || 'upcoming',
      bookedOn: bookedOnFor(r.id, r.day),
    };
  });

  var MISSED_TODAY = {
    'c-p1bdade64': true,
    'c-pf5672f4d': true,
    'c-pb42031d3': true,
    'c-p6f3dd9d6': true,
  };
  list.forEach(function (c) {
    if (MISSED_TODAY[c.id]) c.status = 'missed';
  });

  var CLOCK_KEY = 'gradright_dash_clock_started_v1';
  var DEMO_LIVE_ID = 'c-aarav-live';

  function timeToMinutes(hhmm) {
    var p = String(hhmm || '').split(':');
    return Number(p[0] || 0) * 60 + Number(p[1] || 0);
  }

  function clockStarted() {
    try {
      var n = Number(sessionStorage.getItem(CLOCK_KEY) || 0);
      if (n > 0) return n;
      n = Date.now();
      sessionStorage.setItem(CLOCK_KEY, String(n));
      return n;
    } catch (e) {
      return Date.now();
    }
  }

  function frozenNowMinutes() {
    var t = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
    return t.getHours() * 60 + t.getMinutes();
  }

  function nowMinutes() {
    return frozenNowMinutes();
  }

  function isDemoLive(call) {
    return !!(call && (call.id === DEMO_LIVE_ID || call.demoLive));
  }

  function liveLeftSeconds(call) {
    var duration = Math.max(60, (Number(call.mins) || 30) * 60);
    if (isDemoLive(call)) {
      var elapsed = Math.floor((Date.now() - clockStarted()) / 1000);
      var left = duration - (elapsed % duration);
      return left <= 0 ? duration : left;
    }
    var end = timeToMinutes(call.time) + (Number(call.mins) || 30);
    return Math.max(0, Math.round((end - frozenNowMinutes()) * 60));
  }

  function liveLeftText(call) {
    var left = liveLeftSeconds(call);
    if (left <= 0) return 'Ending now';
    var m = Math.floor(left / 60);
    var s = left % 60;
    return 'Ending in ' + m + ':' + String(s).padStart(2, '0') + ' minutes';
  }

  function phase(call) {
    if (!call) return 'completed';
    if (isDemoLive(call)) return 'ongoing';
    if (call.status === 'missed') return 'missed';
    if (call.status === 'cancelled' || call.status === 'moved') return 'completed';
    var day = String(call.day || '');
    var start = timeToMinutes(call.time);
    var end = start + (Number(call.mins) || 30);
    var now = frozenNowMinutes();
    if (call.status === 'done' || day < todayKey || (day === todayKey && end <= now)) return 'completed';
    if (day === todayKey && start < now && now < end) return 'ongoing';
    return 'upcoming';
  }

  function sortByPhase(a, b) {
    var rank = { ongoing: 0, upcoming: 1, missed: 2, completed: 3 };
    var pa = phase(a);
    var pb = phase(b);
    if (rank[pa] !== rank[pb]) return rank[pa] - rank[pb];
    var ak = String(a.day) + ' ' + String(a.time);
    var bk = String(b.day) + ' ' + String(b.time);
    return pa === 'completed' ? bk.localeCompare(ak) : ak.localeCompare(bk);
  }

  function extraCalBookings() {
    try {
      var raw = localStorage.getItem('gradright_calcom_v1');
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data.bookings) ? data.bookings : [];
    } catch (e) {
      return [];
    }
  }

  function extraCall(id, personId, day, time, mins) {
    var person = (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[personId]) || {};
    return {
      id: id,
      personId: personId,
      name: person.name || personId,
      initials: person.initials || '•',
      amber: !!person.amber,
      role: person.role || 'student',
      service: 'Consult',
      day: day,
      time: time,
      mins: mins || 30,
      status: 'upcoming',
      bookedOn: bookedOnFor(id, day),
    };
  }

  function moreUpcoming() {
    return [
      extraCall('c-up-meera-tonight', 'meera', todayKey, '20:15', 30),
      extraCall('c-up-kabir-tonight', 'kabir', todayKey, '21:00', 45),
      extraCall('c-up-jia-tonight', 'jia', todayKey, '21:45', 30),
      extraCall('c-up-tanvi-tom', 'tanvi', '2026-09-24', '11:30', 40),
      extraCall('c-up-jia-tom', 'jia', '2026-09-24', '14:00', 30),
      extraCall('c-up-ravi-tom', 'ravi', '2026-09-24', '16:30', 45),
      extraCall('c-up-meera-tom', 'meera', '2026-09-24', '18:00', 30),
      extraCall('c-up-rohan-fri', 'rohan', '2026-09-25', '10:00', 30),
      extraCall('c-up-ananya-fri', 'ananya', '2026-09-25', '15:00', 45),
      extraCall('c-up-kabir-fri', 'kabir', '2026-09-25', '17:30', 30),
      extraCall('c-up-sohan-sat', 'sohan', '2026-09-26', '11:00', 30),
      extraCall('c-up-tanvi-sat', 'tanvi', '2026-09-26', '13:15', 45),
      extraCall('c-up-ravi-sat', 'ravi', '2026-09-26', '17:00', 60),
    ];
  }

  function allExtras() {
    return personExtras('aarav').concat(moreUpcoming());
  }

  function personExtras(id) {
    if (id !== 'aarav') return [];
    var person = (window.GradRightDB && GradRightDB.byId && GradRightDB.byId.aarav) || {};
    return [
      {
        id: DEMO_LIVE_ID,
        personId: 'aarav',
        name: person.name || 'Aarav Reddy',
        initials: person.initials || 'AR',
        amber: !!person.amber,
        role: person.role || 'student',
        service: 'College shortlisting',
        day: todayKey,
        time: '17:45',
        mins: 45,
        status: 'upcoming',
        demoLive: true,
        bookedOn: bookedOnFor(DEMO_LIVE_ID, todayKey),
      },
      {
        id: 'c-aarav-next',
        personId: 'aarav',
        name: person.name || 'Aarav Reddy',
        initials: person.initials || 'AR',
        amber: !!person.amber,
        role: person.role || 'student',
        service: 'SOP review',
        day: '2026-09-24',
        time: '10:00',
        mins: 45,
        status: 'upcoming',
        bookedOn: bookedOnFor('c-aarav-next', '2026-09-24'),
      },
      {
        id: 'c-aarav-missed',
        personId: 'aarav',
        name: person.name || 'Aarav Reddy',
        initials: person.initials || 'AR',
        amber: !!person.amber,
        role: person.role || 'student',
        service: 'Essay workshop',
        day: todayKey,
        time: '11:30',
        mins: 30,
        status: 'missed',
        bookedOn: bookedOnFor('c-aarav-missed', todayKey),
      },
    ];
  }

  function formatClock(hhmm) {
    var p = String(hhmm || '').split(':');
    var h = Number(p[0] || 0);
    var m = String(p[1] || '00').padStart(2, '0');
    return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function dayLabel(day) {
    if (day === todayKey) return 'Today';
    var t = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
    var tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    var key =
      tomorrow.getFullYear() +
      '-' +
      String(tomorrow.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(tomorrow.getDate()).padStart(2, '0');
    if (day === key) return 'Tomorrow';
    var yesterday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
    var yKey =
      yesterday.getFullYear() +
      '-' +
      String(yesterday.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(yesterday.getDate()).padStart(2, '0');
    if (day === yKey) return 'Yesterday';
    var parts = String(day || '').split('-').map(Number);
    var d = new Date(parts[0] || 2026, (parts[1] || 1) - 1, parts[2] || 1);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function hint(call) {
    var ph = phase(call);
    var mins = Number(call.mins) || 30;
    if (ph === 'ongoing') return liveLeftText(call);
    if (ph === 'upcoming' && String(call.day) === todayKey) {
      var wait = Math.round(timeToMinutes(call.time) - nowMinutes());
      if (wait <= 0) return mins + ' min · Starts soon';
      if (wait < 60) return mins + ' min · Starts in ' + wait + ' min';
      var h = Math.floor(wait / 60);
      var m = wait % 60;
      if (!m) return mins + ' min · Starts in ' + (h === 1 ? '1 hr' : h + ' hr');
      return mins + ' min · Starts in ' + h + ' hr ' + m + ' min';
    }
    if (ph === 'missed') return mins + ' min · Didn’t join';
    return mins + ' min';
  }

  window.GradRightCalls = {
    todayKey: todayKey,
    list: list,
    phase: phase,
    formatClock: formatClock,
    dayLabel: dayLabel,
    hint: hint,
    isDemoLive: isDemoLive,
    liveLeftText: liveLeftText,
    liveLeftSeconds: liveLeftSeconds,
    today: function () {
      var rows = list.filter(function (c) { return c.day === todayKey; });
      var seen = {};
      rows.forEach(function (c) { seen[c.id] = true; });
      allExtras().concat(extraCalBookings()).forEach(function (c) {
        if (c.day === todayKey && !seen[c.id]) rows.push(c);
      });
      return rows.sort(function (a, b) {
        if (isDemoLive(a) !== isDemoLive(b)) return isDemoLive(a) ? -1 : 1;
        return String(a.time).localeCompare(String(b.time));
      });
    },
    forPerson: function (id) {
      var rows = list.filter(function (c) { return c.personId === id; });
      var seen = {};
      rows.forEach(function (c) { seen[c.id] = true; });
      allExtras().concat(extraCalBookings()).forEach(function (c) {
        if (c.personId === id && !seen[c.id]) rows.push(c);
      });
      return rows.sort(sortByPhase);
    },
    all: function () {
      var rows = list.slice();
      var seen = {};
      rows.forEach(function (c) { seen[c.id] = true; });
      allExtras().concat(extraCalBookings()).forEach(function (c) {
        if (!seen[c.id]) rows.push(c);
      });
      return rows.sort(sortByPhase);
    },
  };
})();
