.setcpu "6502"
.segment "GUARD"
lda $73fe
cmp #$b5
bne old
lda $73c0
beq old
jmp reaction
old: jmp $a9f6
.segment "CODE"
select:
lda $0321,x
beq idle
cmp #$24
bne original
lda $0322,x
cmp #4
bcc original
jmp fast
idle:
lda $0322,x
cmp #8
bcc original
fast:
inc $0322,x
lda #0
rts
original: jmp $a9f6
.segment "REACTION"
reaction:
lda $0321,x
cmp #$1c
bcc normal
cmp #$21
bcs normal
lda #0
sta $88
jmp fast
normal: jmp select
