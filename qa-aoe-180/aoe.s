.setcpu "6502"
.export load,save,cards,next,indicator,count,total,post,group,getbp,putbp,refilled,reset
.segment "CODE"
; NMI saves the current bank by reading $8000, not the software bank shadow.
; Keep the native bank header (including IRQ flags at $800A) ahead of code.
.byte 18
.res 15,0
; 300 reserve records: HP16 + defense/emblem card. All state lives in WRAM.
ACTIVE=$73c0
READY=$73c1
START=$73c2
IDX=$73c3
IDXH=$73c4
GLOBAL=$73c5
GLOBALH=$73c6
OFF=$73c7
TMPL=$73c8
TMP=$73c9
PAGE=$73ca
VIEWPAGE=$73cf
.macro far bank,addr
 jsr :+
 jmp :++
:
 jsr $c749
 .byte bank
 .word addr
:
.endmacro
; Preserve callers' registers and working zero page across bookkeeping.
push:
 pla
 sta $73fe
 pla
 sta $73ff
 pha
 lda $73fe
 pha
 rts
; helpers use 12/13 only; outer save/load/counter protect these as needed.
ptr:
 ldy IDX
 lda IDXH
 bne @high
 lda slotlo,y
 sta $12
 lda slothi,y
 sta $13
 rts
@high:
 lda slotlo1,y
 sta $12
 lda slothi1,y
 sta $13
 rts
; GLOBAL = LOADED-batch + page*5 + offset/18
global_index:
 lda $7370
 sta GLOBAL
 lda #0
 sta GLOBALH
 asl GLOBAL
 rol GLOBALH
 asl GLOBAL
 rol GLOBALH
 clc
 lda GLOBAL
 adc $7370
 sta GLOBAL
 lda GLOBALH
 adc #0
 sta GLOBALH
 sec
 lda $739a
 sbc $7372
 sta TMP
 lda $739b
 sbc #0
 tay
 clc
 lda GLOBAL
 adc TMP
 sta GLOBAL
 tya
 adc GLOBALH
 sta GLOBALH
 lda OFF
 ldy #0
@div:
 cmp #18
 bcc @add
 sbc #18
 iny
 bne @div
@add:
 tya
 clc
 adc GLOBAL
 sta GLOBAL
 bcc @index
 inc GLOBALH
@index:
 sec
 lda GLOBAL
 sbc #100
 sta IDX
 lda GLOBALH
 sbc #0
 sta IDXH
 rts
; derive template exactly as batch initialization: (global mod 100) live slots.
template:
 lda GLOBAL
 sta TMP
 lda GLOBALH
 tay
@mod:
 cpy #0
 bne @sub
 lda TMP
 cmp #100
 bcc @walk
@sub:
 sec
 lda TMP
 sbc #100
 sta TMP
 tya
 sbc #0
 tay
 jmp @mod
@walk:
 ldx #0
@live:
 lda $7500,x
 cmp #64
 bcc @found
@advance:
 txa
 clc
 adc #18
 cmp #90
 bcc @set
 lda #0
@set:
 tax
 jmp @live
@found:
 lda TMP
 beq @done
 dec TMP
 jmp @advance
@done:
 stx TMPL
 rts
load:
 sta $7370
 pha
 lda #255
 sta VIEWPAGE
 pla
 cmp $7373
 bcs virtual_load
 tax
 lda $6993,x
 sta $12
 lda $69a7,x
 sta $13
 ldy #89
@copy:
 lda ($12),y
 sta $02a2,y
 dey
 bpl @copy
 lda $7370
 sta VIEWPAGE
 lda #14
 sta $96
 rts
virtual_load:
 lda $10
 pha
 lda $11
 pha
 lda $16
 pha
 lda $17
 pha
 lda $9a
 pha
 lda #0
 sta OFF
@slot:
 jsr global_index
 lda GLOBALH
 cmp $7399
 bcc @valid
 bne @empty
 lda GLOBAL
 cmp $7398
 bcc @valid
@empty:
 ldx OFF
 lda #128
 sta $02a2,x
 sta $02ae,x
 lda #0
 sta $02a4,x
 sta $02a5,x
 jmp @advance
@valid:
 jsr template
 ldy OFF
 ldx TMPL
 lda #18
 sta TMP
@copy:
 lda $7500,x
 sta $02a2,y
 inx
 iny
 dec TMP
 bne @copy
 jsr ptr
 ldx OFF
 ldy #0
 lda ($12),y
 sta $02a4,x
 iny
 lda ($12),y
 sta $02a5,x
 ora $02a4,x
 bne @card
 lda $02a2,x
 ora #64
 sta $02a2,x
@card:
 iny
 lda ($12),y
 bne @have
 ; This routine only draws a defender card, without resetting combat animation.
 far 12,$b458
 jsr ptr
 ldx OFF
 ldy #2
 lda $02b0,x
 sta ($12),y
@have:
 sta $02b0,x
@advance:
 lda OFF
 clc
 adc #18
 sta OFF
 cmp #90
 bcs :+
 jmp @slot
:
 lda $7370
 sta VIEWPAGE
 lda #14
 sta $96
 pla
 sta $9a
 pla
 sta $17
 pla
 sta $16
 pla
 sta $11
 pla
 sta $10
 lda #14
 rts
save:
 pha
 txa
 pha
 tya
 pha
 lda $12
 pha
 lda $13
 pha
 lda $7371
 beq @done
 lda $7370
 cmp $7373
 bcs @virtual
 tax
 lda $6993,x
 sta $12
 lda $69a7,x
 sta $13
 ldy #89
@copy:
 lda $02a2,y
 sta ($12),y
 dey
 bpl @copy
 jmp @done
@virtual:
 lda #0
 sta OFF
@slot:
 jsr global_index
 lda GLOBALH
 cmp $7399
 bcc @valid
 bne @done
 lda GLOBAL
 cmp $7398
 bcs @done
@valid:
 jsr ptr
 ldx OFF
 ldy #0
 lda $02a4,x
 sta ($12),y
 iny
 lda $02a5,x
 sta ($12),y
 iny
 lda $02b0,x
 sta ($12),y
 lda OFF
 clc
 adc #18
 sta OFF
 cmp #90
 bcc @slot
@done:
 pla
 sta $13
 pla
 sta $12
 pla
 tay
 pla
 tax
 pla
 rts
total:
 far 16,$ae2f
 pha
 txa
 pha
 tya
 pha
 lda $12
 pha
 lda $13
 pha
 lda #0
 sta ACTIVE
 sta READY
 lda $73b5
 cmp #$b8
 bne @done
 lda #0
 sta IDX
 sta IDXH
@slot:
 clc
 lda IDX
 adc #100
 sta GLOBAL
 lda IDXH
 adc #0
 sta GLOBALH
 jsr template
 jsr ptr
 ldx TMPL
 ldy #0
 lda $7502,x
 sta ($12),y
 iny
 lda $7503,x
 sta ($12),y
 iny
 lda #0
 sta ($12),y
 inc IDX
 bne @check
 inc IDXH
@check:
 lda IDXH
 beq @slot
 lda IDX
 cmp #44
 bcc @slot
 lda #$a0
 sta READY
@done:
 pla
 sta $13
 pla
 sta $12
 pla
 tay
 pla
 tax
 pla
 rts
cards:
 ; Relocated original initializer, plus clearing reserve cards once per turn.
 lda $7371
 bne @expanded
 far 12,$8308
 rts
@expanded:
 jsr save
 lda READY
 cmp #$a0
 bne @pages
 lda #0
 sta IDX
 sta IDXH
@clear:
 jsr ptr
 ldy #2
 lda #0
 sta ($12),y
 inc IDX
 bne @test
 inc IDXH
@test:
 lda IDXH
 beq @clear
 lda IDX
 cmp #44
 bcc @clear
@pages:
 lda #0
 sta $7374
@page:
 lda $7374
 jsr load
 far 12,$8308
 jsr save
 inc $7374
 lda $7374
 cmp $7373
 bcc @page
 lda #0
 jsr load
 far 12,$b96a
 lda #0
 rts
group:
 lda $031e,x
 cmp #$40
 beq @yes
 cmp #$db
 beq @yes
 cmp #$e2
 beq @yes
 cmp #$82
 bne @metadata
 lda $030e,x
 cmp #4
 beq @yes
@metadata:
 far 13,$bb10
 lda $031e,x
 and #31
 asl a
 tay
 lda ($12),y
 cmp #$7d
 beq @yes
 lda #1
 rts
@yes:
 lda #0
 rts
post:
 pha
 txa
 pha
 tya
 pha
 lda $12
 pha
 lda $13
 pha
 jsr save
 lda $7371
 cmp #$a5
 bne @done
 lda $73b5
 cmp #$b8
 bne @done
 lda READY
 cmp #$a0
 bne @done
 lda ACTIVE
 bne @done
 jsr $c7ca
 cpx #0
 bne @done
 jsr group
 bne @done
 lda #1
 sta ACTIVE
 lda $7370
 sta START
@done:
 pla
 sta $13
 pla
 sta $12
 pla
 tay
 pla
 tax
 pla
 rts
next:
 far 12,$b843
 lda $7371
 beq @done
 lda $10
 bne @done
 jsr $c7ca
 cpx #0
 bne @done
 jsr group
 bne @done
 jsr save
@page:
 lda $7370
 clc
 adc #1
 pha
 lda READY
 cmp #$a0
 beq @expanded
 pla
 cmp $7373
 bcs @done
 jmp @load
@expanded:
 pla
 ; Empty slots beyond total are never loaded; compare page start global.
 sta $7370
 lda #0
 sta OFF
 jsr global_index
 lda GLOBALH
 cmp $7399
 bcc @virtual
 bne @finish
 lda GLOBAL
 cmp $7398
 bcs @finish
@virtual:
 lda $7370
@load:
 jsr load
 ldy #0
 ldx #0
@slot:
 lda $02a2,y
 cmp #64
 bcc @found
 inx
 tya
 clc
 adc #18
 tay
 cmp #90
 bcc @slot
 bcs @page
@found:
 txa
 ora #16
 ldx $032d
 stx $11
 sta $020f,x
 lda $7370
 sta $7400,x
 lda #255
 sta $10
@done:
 rts
@finish:
 lda #0
 sta ACTIVE
 jsr load
 ldx $032d
 lda #0
 sta $7400,x
 jsr count
 ; count() handles damaged/empty reserve batches through the refill hook.
 lda #0
 sta $10
 rts
count:
 lda ACTIVE
 beq @normal
 ; Keep the attack running even when its current batch has become empty.
 ldy #1
 rts
@normal:
 far 16,$aea7
 cpy #0
 beq @done
 ; A refill can contain only already-defeated reserve enemies. Skip such batches.
 jsr $6923
 cpy #0
 bne @done
 lda $7396
 ora $7397
 bne @normal
@done:
 rts
; called inside original refill, replacing JSR83E8 + LDX0 + PLA.
refilled:
 far 16,$83e8
 lda READY
 cmp #$a0
 bne @done
 lda #0
 sta PAGE
@page:
 lda PAGE
 sta $7370
 lda #0
 sta OFF
@slot:
 jsr global_index
 jsr ptr
 ldx OFF
 ldy #0
 lda ($12),y
 sta $02a4,x
 iny
 lda ($12),y
 sta $02a5,x
 ora $02a4,x
 bne @alive
 lda $02a2,x
 ora #64
 sta $02a2,x
@alive:
 iny
 lda ($12),y
 sta $02b0,x
 lda OFF
 clc
 adc #18
 sta OFF
 cmp #90
 bcc @slot
 jsr save
 inc PAGE
 lda PAGE
 cmp $7373
 bcs @loaded
 jsr load
 jmp @page
@loaded:
 lda #0
 jsr load
@done:
 ; The displaced PLA belongs to the parent stack, so cannot execute here.
 ldx #0
 rts
getbp:
 lda $7371
 cmp #$a5
 bne @physical
 lda $7370
 cmp $7373
 bcc @physical
 stx OFF
 jsr global_index
 jsr template
 ldx OFF
 lda $02a6,x
 sta $7e98
 lda $02a7,x
 sta $7e99
 lda $02a8,x
 sta $7e9a
 lda TMPL
 ldy #0
@div:
 cmp #18
 bcc @offset
 sbc #18
 iny
 bne @div
@offset:
 tya
 asl a
 asl a
 sty TMP
 clc
 adc TMP
 tay
 ldx #0
@high:
 lda $739c,y
 sta $7e9b,x
 iny
 inx
 cpx #5
 bcc @high
 ldx OFF
 rts
@physical:
 lda $02a6,x
 sta $7e98
 far 16,$824b
 rts
putbp:
 lda $7371
 cmp #$a5
 bne @physical
 lda $7370
 cmp $7373
 bcc @physical
 lda $7e98
 sta $02a6,x
 lda $7e99
 sta $02a7,x
 lda $7e9a
 sta $02a8,x
 rts
@physical:
 lda $7e98
 sta $02a6,x
 far 16,$82ca
 rts
indicator:
 far 12,$8d61
 lda $7371
 bne :+
 rts
:
.incbin "indicator.bin"
reset:
 lda #0
 sta ACTIVE
 sta READY
 far 16,$af50
 rts
.include "slots.inc"
