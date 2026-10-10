.setcpu "6502"
.segment "CODE"
lda #96
sta $0f
lda $73fe
cmp #$b5
bne done
lda $73c0
beq done
check:
lda $0f
cmp #8
beq done
lda $7ec3
bne done
ldx #11
shift:
lda $7eb7,x
sta $7eb8,x
dex
bne shift
lda #0
sta $7eb8
lda $0f
sec
sbc #8
sta $0f
jmp check
done:
rts
