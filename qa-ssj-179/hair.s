.setcpu "6502"
.segment "CODE"
.export select_hair
select_hair:
 sta $01
 lda $02
 cmp #1
 bne gohan
 lda $75ae
 and #4
 beq original
 lda goku_low,y
 sta $00
 lda goku_high,y
 sta $01
 jmp original
gohan:
 lda $75ae
 and #8
 beq original
 lda gohan_low,y
 sta $00
 lda gohan_high,y
 sta $01
original:
 ldy #0
 jmp $80c7
.include "hair-data.inc"
