.setcpu "6502"
.segment "CODE"
; Called instead of post's JSR save. Preserve the complete save return state.
jsr $81f4
php
pha
txa
pha
tya
pha
lda $73fe
cmp #$b5
bne done
lda $7e62
bne done
lda $7370
cmp $718f
bne done
lda $034d
cmp #73
bcs done
ldx #0
ldy #0
slot:
cmp #18
bcc ready
sec
sbc #18
pha
txa
clc
adc #6
tax
pla
iny
jmp slot
ready:
cmp #0
bne done
lda bits,y
and $718e
beq done
; Low six bits retain the quotient exponent (63 = zero denominator).
; Bit 6 marks a final native result; bit 7 marks a native miss ($A7=0).
lda $7175,x
and #$3f
ora #$40
ldy $a7
bne hit
ora #$80
hit:
sta $7175,x
done:
pla
tay
pla
tax
pla
plp
rts
bits: .byte 1,2,4,8,16
